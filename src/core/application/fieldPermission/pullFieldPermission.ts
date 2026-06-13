import type { FieldPermissionConfig } from "@/core/domain/fieldPermission/entity";
import { FieldPermissionConfigSerializer } from "@/core/domain/fieldPermission/services/configSerializer";
import {
  computeFieldPermissionThreeWayMerge,
  type FieldPermissionMergeResolution,
  type FieldPermissionThreeWayMerge,
  resolveFieldPermissionMerge,
} from "@/core/domain/fieldPermission/services/fieldPermissionMerge";
import type { FieldPermissionServiceArgs } from "../container/fieldPermission";
import { wrapBusinessRuleError } from "../error";
import { stringifyConfig } from "../stringifyConfig";
import { saveFieldPermissionSnapshotAndRevision } from "./fieldPermissionStateIo";
import { loadFieldPermissionThreeWayInputs } from "./loadFieldPermissionThreeWayInputs";

export type PullFieldPermissionInput = {
  /** Overwrite local with remote (capture-equivalent), bypassing merge. */
  readonly force?: boolean;
};

export type PullFieldPermissionOutput =
  | { readonly mode: "force"; readonly configText: string }
  | { readonly mode: "firstTime"; readonly configText: string }
  | {
      readonly mode: "merged";
      readonly merge: FieldPermissionThreeWayMerge;
      readonly remoteConfig: FieldPermissionConfig;
      readonly remoteRevision: string;
    };

function serializePermissions(
  container: FieldPermissionServiceArgs["container"],
  config: FieldPermissionConfig,
): string {
  return stringifyConfig(
    container.configCodec,
    FieldPermissionConfigSerializer.serialize(config),
  );
}

/**
 * First stage of `field-acl pull`.
 *
 * - `force`: returns the remote snapshot for local overwrite (capture-equiv).
 * - first run (no state): returns remote for one-way overwrite.
 * - otherwise: computes the record-keyed 3-way merge and returns it for conflict
 *   resolution by the CLI. The local YAML / state are NOT written here — that
 *   happens in {@link applyPulledFieldPermissionMerge} after resolution, so an
 *   aborted resolution leaves local and state untouched.
 *
 * This stage never writes to the remote (pull is read-only against kintone).
 */
export async function pullFieldPermission({
  container,
  input,
}: FieldPermissionServiceArgs<PullFieldPermissionInput>): Promise<PullFieldPermissionOutput> {
  const { state, local, remote } =
    await loadFieldPermissionThreeWayInputs(container);

  if (input.force || state === undefined || local === undefined) {
    const configText = serializePermissions(container, remote.config);
    await container.fieldPermissionStorage.update(configText);
    await saveFieldPermissionSnapshotAndRevision(
      container,
      remote.config,
      remote.revision,
    );
    return {
      mode: input.force ? "force" : "firstTime",
      configText,
    };
  }

  const merge = computeFieldPermissionThreeWayMerge(
    state,
    local,
    remote.config,
  );

  return {
    mode: "merged",
    merge,
    remoteConfig: remote.config,
    remoteRevision: remote.revision,
  };
}

export type ApplyPulledFieldPermissionMergeInput = {
  readonly merge: FieldPermissionThreeWayMerge;
  readonly resolution: FieldPermissionMergeResolution;
  readonly remoteConfig: FieldPermissionConfig;
  readonly remoteRevision: string;
};

/**
 * Second stage of `field-acl pull`: applies a resolved 3-way merge.
 *
 * Writes the merged config to the local YAML and updates the base to the remote
 * snapshot/revision. Called only after the CLI has fully resolved all conflicts;
 * if the user aborts resolution this is never invoked, so local and state remain
 * unchanged.
 */
export async function applyPulledFieldPermissionMerge({
  container,
  input,
}: FieldPermissionServiceArgs<ApplyPulledFieldPermissionMergeInput>): Promise<{
  readonly configText: string;
}> {
  const merged = wrapBusinessRuleError(() =>
    resolveFieldPermissionMerge(input.merge, input.resolution),
  );
  const configText = serializePermissions(container, merged);
  await container.fieldPermissionStorage.update(configText);
  await saveFieldPermissionSnapshotAndRevision(
    container,
    input.remoteConfig,
    input.remoteRevision,
  );
  return { configText };
}
