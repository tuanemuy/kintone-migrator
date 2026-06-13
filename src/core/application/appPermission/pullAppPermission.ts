import type { AppPermissionConfig } from "@/core/domain/appPermission/entity";
import {
  type AppPermissionMergeResolution,
  type AppPermissionThreeWayMerge,
  computeAppPermissionThreeWayMerge,
  resolveAppPermissionMerge,
} from "@/core/domain/appPermission/services/appPermissionMerge";
import { AppPermissionConfigSerializer } from "@/core/domain/appPermission/services/configSerializer";
import type { AppPermissionServiceArgs } from "../container/appPermission";
import { wrapBusinessRuleError } from "../error";
import { stringifyConfig } from "../stringifyConfig";
import { saveAppPermissionSnapshotAndRevision } from "./appPermissionStateIo";
import { loadAppPermissionThreeWayInputs } from "./loadAppPermissionThreeWayInputs";

export type PullAppPermissionInput = {
  /** Overwrite local with remote (capture-equivalent), bypassing merge. */
  readonly force?: boolean;
};

export type PullAppPermissionOutput =
  | { readonly mode: "force"; readonly configText: string }
  | { readonly mode: "firstTime"; readonly configText: string }
  | {
      readonly mode: "merged";
      readonly merge: AppPermissionThreeWayMerge;
      readonly remoteConfig: AppPermissionConfig;
      readonly remoteRevision: string;
    };

function serializePermissions(
  container: AppPermissionServiceArgs["container"],
  config: AppPermissionConfig,
): string {
  return stringifyConfig(
    container.configCodec,
    AppPermissionConfigSerializer.serialize(config),
  );
}

/**
 * First stage of `app-acl pull`.
 *
 * - `force`: returns the remote snapshot for local overwrite (capture-equiv).
 * - first run (no state): returns remote for one-way overwrite.
 * - otherwise: computes the record-keyed 3-way merge and returns it for conflict
 *   resolution by the CLI. The local YAML / state are NOT written here — that
 *   happens in {@link applyPulledAppPermissionMerge} after resolution, so an
 *   aborted resolution leaves local and state untouched.
 *
 * This stage never writes to the remote (pull is read-only against kintone).
 */
export async function pullAppPermission({
  container,
  input,
}: AppPermissionServiceArgs<PullAppPermissionInput>): Promise<PullAppPermissionOutput> {
  const { state, local, remote } =
    await loadAppPermissionThreeWayInputs(container);

  if (input.force || state === undefined || local === undefined) {
    const configText = serializePermissions(container, remote.config);
    await container.appPermissionStorage.update(configText);
    await saveAppPermissionSnapshotAndRevision(
      container,
      remote.config,
      remote.revision,
    );
    return {
      mode: input.force ? "force" : "firstTime",
      configText,
    };
  }

  const merge = computeAppPermissionThreeWayMerge(state, local, remote.config);

  return {
    mode: "merged",
    merge,
    remoteConfig: remote.config,
    remoteRevision: remote.revision,
  };
}

export type ApplyPulledAppPermissionMergeInput = {
  readonly merge: AppPermissionThreeWayMerge;
  readonly resolution: AppPermissionMergeResolution;
  readonly remoteConfig: AppPermissionConfig;
  readonly remoteRevision: string;
};

/**
 * Second stage of `app-acl pull`: applies a resolved 3-way merge.
 *
 * Writes the merged config to the local YAML and updates the base to the remote
 * snapshot/revision. Called only after the CLI has fully resolved all conflicts;
 * if the user aborts resolution this is never invoked, so local and state remain
 * unchanged.
 */
export async function applyPulledAppPermissionMerge({
  container,
  input,
}: AppPermissionServiceArgs<ApplyPulledAppPermissionMergeInput>): Promise<{
  readonly configText: string;
}> {
  const merged = wrapBusinessRuleError(() =>
    resolveAppPermissionMerge(input.merge, input.resolution),
  );
  const configText = serializePermissions(container, merged);
  await container.appPermissionStorage.update(configText);
  await saveAppPermissionSnapshotAndRevision(
    container,
    input.remoteConfig,
    input.remoteRevision,
  );
  return { configText };
}
