import {
  ConflictError,
  ConflictErrorCode,
  ValidationError,
  ValidationErrorCode,
} from "@/core/application/error";
import { isLayoutEqual } from "@/core/domain/formSchema/services/diffDetector";
import { enrichLayoutWithFields } from "@/core/domain/formSchema/services/layoutEnricher";
import { computeThreeWayMerge } from "@/core/domain/formSchema/services/threeWayMerge";
import type { FormSchemaServiceArgs } from "../container/formSchema";
import { applySchemaChanges } from "./applySchemaChanges";
import { assertSchemaValid } from "./assertSchemaValid";
import type { PushSchemaOutput } from "./dto";
import { loadThreeWayInputs } from "./loadThreeWayInputs";
import { saveState } from "./schemaStateIo";

export type PushSchemaInput = {
  /** Skip drift checking and send no expected revision (revision-skip). */
  readonly force?: boolean;
};

/** Message thrown when the remote drifted from base and `--force` was not set. */
export const PUSH_DRIFT_MESSAGE =
  "実環境が base から変更されています。先に `schema pull` を実行してください。";

/**
 * Applies the local schema to the remote with drift detection and optimistic
 * concurrency control (AC-7, AC-8, AC-9, AC-11, AC-14).
 *
 * - Reads the current revision (expected-revision source + drift signal) and
 *   the remote snapshot (drift judged by snapshot comparison, never skipped by
 *   revision — ADR-004).
 * - drift && !force → {@link ConflictError} with a push-specific message (drift
 *   distinguished from API optimistic-lock conflicts by message — ADR-008).
 * - otherwise applies the local schema via the shared {@link applySchemaChanges}
 *   (type changes / subtable additions rejected with ValidationError — AC-13),
 *   sending the observed remote revision as the expected revision (ADR-005).
 * - `--force` skips the drift check and sends no expected revision.
 * - first run (no state): applies with no revision guard and initializes state.
 *
 * Deploy is performed by the CLI (single-path `confirmAndDeploy`). State records
 * the preview revision observed after applying.
 */
export async function pushSchema({
  container,
  input,
}: FormSchemaServiceArgs<PushSchemaInput>): Promise<PushSchemaOutput> {
  const { state, local, remote, remoteRevision } =
    await loadThreeWayInputs(container);

  if (local === undefined) {
    throw new ValidationError(
      ValidationErrorCode.InvalidInput,
      "Schema file not found",
    );
  }

  assertSchemaValid(local);

  const firstTime = state === undefined;

  if (!firstTime && !input.force) {
    const merge = computeThreeWayMerge(state.schema, local, remote);
    const hasFieldDrift = merge.fieldEntries.some(
      (e) => e.change.kind === "remoteOnly" || e.change.kind === "conflict",
    );
    const enrichedBaseLayout = enrichLayoutWithFields(
      state.schema.layout,
      state.schema.fields,
    );
    const layoutDrift = !isLayoutEqual(enrichedBaseLayout, merge.remoteLayout);

    if (hasFieldDrift || layoutDrift) {
      throw new ConflictError(ConflictErrorCode.Conflict, PUSH_DRIFT_MESSAGE);
    }
  }

  // Expected revision: observed current revision when guarding (normal push,
  // no drift so it equals base.revision); none for --force or first run.
  const expectedRevision =
    input.force || firstTime ? undefined : remoteRevision;

  await applySchemaChanges(local, { container, expectedRevision });

  // Record the post-apply preview revision and local schema as the new base.
  const newRevision = await container.formConfigurator.getRevision();
  await saveState(
    container.schemaStateStorage,
    container.configCodec,
    newRevision,
    local,
  );

  return { mode: firstTime ? "firstTime" : "push", revision: newRevision };
}
