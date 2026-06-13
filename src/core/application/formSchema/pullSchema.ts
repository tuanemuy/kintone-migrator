import { wrapBusinessRuleError } from "@/core/application/error";
import type { Schema } from "@/core/domain/formSchema/entity";
import { enrichLayoutWithFields } from "@/core/domain/formSchema/services/layoutEnricher";
import { SchemaSerializer } from "@/core/domain/formSchema/services/schemaSerializer";
import {
  computeThreeWayMerge,
  resolveMerge,
} from "@/core/domain/formSchema/services/threeWayMerge";
import type {
  FormSchemaThreeWayMerge,
  MergeResolution,
} from "@/core/domain/formSchema/valueObject";
import type { FormSchemaServiceArgs } from "../container/formSchema";
import { stringifyConfig } from "../stringifyConfig";
import { assertSchemaValid } from "./assertSchemaValid";
import type { PullSchemaOutput } from "./dto";
import { loadThreeWayInputs } from "./loadThreeWayInputs";
import { saveState } from "./schemaStateIo";

export type PullSchemaInput = {
  /** Overwrite local with remote (capture-equivalent), bypassing merge. */
  readonly force?: boolean;
};

function serializeSchema(
  container: FormSchemaServiceArgs["container"],
  schema: Schema,
): string {
  const enrichedLayout = enrichLayoutWithFields(schema.layout, schema.fields);
  return stringifyConfig(
    container.configCodec,
    SchemaSerializer.serialize(enrichedLayout, schema.fields),
  );
}

/**
 * First stage of `schema pull` (AC-4, AC-5, AC-6, AC-11).
 *
 * - `force`: returns the remote snapshot for local overwrite (capture-equiv).
 * - first run (no state): returns remote for one-way overwrite.
 * - otherwise: computes the 3-way merge and returns it for conflict resolution
 *   by the CLI. The local YAML / state are NOT written here — that happens in
 *   {@link applyPulledMerge} after resolution, so an aborted resolution leaves
 *   local and state untouched (AC-15).
 *
 * This stage never writes to the remote (pull is read-only against kintone).
 */
export async function pullSchema({
  container,
  input,
}: FormSchemaServiceArgs<PullSchemaInput>): Promise<PullSchemaOutput> {
  const { state, local, remote, remoteRevision } =
    await loadThreeWayInputs(container);

  // force / firstTime intentionally trust the remote without assertSchemaValid:
  // these are capture-equivalent one-way overwrites (ADR-006/ADR-007, "base =
  // capture result"), and the remote is the source of truth. The merged path
  // (applyPulledMerge), by contrast, validates before writing because the
  // merged schema is locally synthesized and benefits from early feedback.
  if (input.force) {
    const schemaText = serializeSchema(container, remote);
    await container.schemaStorage.update(schemaText);
    await saveState(
      container.schemaStateStorage,
      container.configCodec,
      remoteRevision,
      remote,
    );
    return { mode: "force", schemaText };
  }

  if (state === undefined || local === undefined) {
    // First run / no local: one-way overwrite from remote and initialize state.
    const schemaText = serializeSchema(container, remote);
    await container.schemaStorage.update(schemaText);
    await saveState(
      container.schemaStateStorage,
      container.configCodec,
      remoteRevision,
      remote,
    );
    return { mode: "firstTime", schemaText };
  }

  const merge = computeThreeWayMerge(state.schema, local, remote);

  return { mode: "merged", merge, remoteRevision, remoteSchema: remote };
}

export type ApplyPulledMergeInput = {
  readonly merge: FormSchemaThreeWayMerge;
  readonly resolution: MergeResolution;
  readonly remoteRevision: string;
  readonly remoteSchema: Schema;
};

/**
 * Second stage of `schema pull`: applies a resolved 3-way merge.
 *
 * Writes the merged schema to the local YAML and updates the state to the
 * remote snapshot/revision. Called only after the CLI has fully resolved all
 * conflicts; if the user aborts resolution this is never invoked, so local and
 * state remain unchanged (AC-15).
 */
export async function applyPulledMerge({
  container,
  input,
}: FormSchemaServiceArgs<ApplyPulledMergeInput>): Promise<{
  readonly schemaText: string;
}> {
  // resolveMerge throws a BusinessRuleError when the resolution does not cover
  // every conflict (programmer invariant); translate it to a ValidationError per
  // the CLAUDE.md error policy (domain → application).
  const merged = wrapBusinessRuleError(() =>
    resolveMerge(input.merge, input.resolution),
  );
  // Validate the locally synthesized merged schema before writing for early
  // feedback (unlike force/firstTime which trust the remote as-is).
  assertSchemaValid(merged);
  const schemaText = serializeSchema(container, merged);
  await container.schemaStorage.update(schemaText);
  await saveState(
    container.schemaStateStorage,
    container.configCodec,
    input.remoteRevision,
    input.remoteSchema,
  );
  return { schemaText };
}
