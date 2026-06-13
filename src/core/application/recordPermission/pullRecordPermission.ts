import type { RecordPermissionConfig } from "@/core/domain/recordPermission/entity";
import { RecordPermissionConfigSerializer } from "@/core/domain/recordPermission/services/configSerializer";
import {
  computeRecordPermissionThreeWayMerge,
  type RecordPermissionMergeResolution,
  type RecordPermissionThreeWayMerge,
  resolveRecordPermissionMerge,
} from "@/core/domain/recordPermission/services/recordPermissionMerge";
import type { RecordPermissionServiceArgs } from "../container/recordPermission";
import { wrapBusinessRuleError } from "../error";
import { stringifyConfig } from "../stringifyConfig";
import { loadRecordPermissionThreeWayInputs } from "./loadRecordPermissionThreeWayInputs";
import { saveRecordPermissionSnapshotAndRevision } from "./recordPermissionStateIo";

export type PullRecordPermissionInput = {
  /** Overwrite local with remote (capture-equivalent), bypassing merge. */
  readonly force?: boolean;
};

export type PullRecordPermissionOutput =
  | { readonly mode: "force"; readonly configText: string }
  | { readonly mode: "firstTime"; readonly configText: string }
  | {
      readonly mode: "merged";
      readonly merge: RecordPermissionThreeWayMerge;
      readonly remoteConfig: RecordPermissionConfig;
      readonly remoteRevision: string;
    };

function serializePermissions(
  container: RecordPermissionServiceArgs["container"],
  config: RecordPermissionConfig,
): string {
  return stringifyConfig(
    container.configCodec,
    RecordPermissionConfigSerializer.serialize(config),
  );
}

/**
 * First stage of `record-acl pull`.
 *
 * - `force`: returns the remote snapshot for local overwrite (capture-equiv).
 * - first run (no state): returns remote for one-way overwrite.
 * - otherwise: computes the record-keyed 3-way merge and returns it for conflict
 *   resolution by the CLI. The local YAML / state are NOT written here — that
 *   happens in {@link applyPulledRecordPermissionMerge} after resolution, so an
 *   aborted resolution leaves local and state untouched.
 *
 * This stage never writes to the remote (pull is read-only against kintone).
 */
export async function pullRecordPermission({
  container,
  input,
}: RecordPermissionServiceArgs<PullRecordPermissionInput>): Promise<PullRecordPermissionOutput> {
  const { state, local, remote } =
    await loadRecordPermissionThreeWayInputs(container);

  if (input.force || state === undefined || local === undefined) {
    const configText = serializePermissions(container, remote.config);
    await container.recordPermissionStorage.update(configText);
    await saveRecordPermissionSnapshotAndRevision(
      container,
      remote.config,
      remote.revision,
    );
    return {
      mode: input.force ? "force" : "firstTime",
      configText,
    };
  }

  const merge = computeRecordPermissionThreeWayMerge(
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

export type ApplyPulledRecordPermissionMergeInput = {
  readonly merge: RecordPermissionThreeWayMerge;
  readonly resolution: RecordPermissionMergeResolution;
  readonly remoteConfig: RecordPermissionConfig;
  readonly remoteRevision: string;
};

/**
 * Second stage of `record-acl pull`: applies a resolved 3-way merge.
 *
 * Writes the merged config to the local YAML and updates the base to the remote
 * snapshot/revision. Called only after the CLI has fully resolved all conflicts;
 * if the user aborts resolution this is never invoked, so local and state remain
 * unchanged.
 */
export async function applyPulledRecordPermissionMerge({
  container,
  input,
}: RecordPermissionServiceArgs<ApplyPulledRecordPermissionMergeInput>): Promise<{
  readonly configText: string;
}> {
  const merged = wrapBusinessRuleError(() =>
    resolveRecordPermissionMerge(input.merge, input.resolution),
  );
  const configText = serializePermissions(container, merged);
  await container.recordPermissionStorage.update(configText);
  await saveRecordPermissionSnapshotAndRevision(
    container,
    input.remoteConfig,
    input.remoteRevision,
  );
  return { configText };
}
