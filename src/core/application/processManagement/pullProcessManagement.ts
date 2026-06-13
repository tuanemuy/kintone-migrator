import type { ProcessManagementConfig } from "@/core/domain/processManagement/entity";
import { ProcessManagementConfigSerializer } from "@/core/domain/processManagement/services/configSerializer";
import {
  computeProcessManagementThreeWayMerge,
  type ProcessManagementMergeResolution,
  type ProcessManagementThreeWayMerge,
  resolveProcessManagementMerge,
} from "@/core/domain/processManagement/services/processManagementMerge";
import type { ProcessManagementServiceArgs } from "../container/processManagement";
import { wrapBusinessRuleError } from "../error";
import { stringifyConfig } from "../stringifyConfig";
import { loadProcessManagementThreeWayInputs } from "./loadProcessManagementThreeWayInputs";
import { saveProcessManagementSnapshotAndRevision } from "./processManagementStateIo";

export type PullProcessManagementInput = {
  /** Overwrite local with remote (capture-equivalent), bypassing merge. */
  readonly force?: boolean;
};

export type PullProcessManagementOutput =
  | { readonly mode: "force"; readonly configText: string }
  | { readonly mode: "firstTime"; readonly configText: string }
  | {
      readonly mode: "merged";
      readonly merge: ProcessManagementThreeWayMerge;
      readonly remoteConfig: ProcessManagementConfig;
      readonly remoteRevision: string;
    };

function serializeProcess(
  container: ProcessManagementServiceArgs["container"],
  config: ProcessManagementConfig,
): string {
  return stringifyConfig(
    container.configCodec,
    ProcessManagementConfigSerializer.serialize(config),
  );
}

/**
 * First stage of `process pull`. Same shape as the other single-config
 * pulls: force / first run overwrite local from remote; otherwise compute the
 * whole-entity merge and return it for CLI conflict resolution without touching
 * local/state (side-effect free when aborted).
 */
export async function pullProcessManagement({
  container,
  input,
}: ProcessManagementServiceArgs<PullProcessManagementInput>): Promise<PullProcessManagementOutput> {
  const { state, local, remote } =
    await loadProcessManagementThreeWayInputs(container);

  if (input.force || state === undefined || local === undefined) {
    const configText = serializeProcess(container, remote.config);
    await container.processManagementStorage.update(configText);
    await saveProcessManagementSnapshotAndRevision(
      container,
      remote.config,
      remote.revision,
    );
    return {
      mode: input.force ? "force" : "firstTime",
      configText,
    };
  }

  const merge = computeProcessManagementThreeWayMerge(
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

export type ApplyPulledProcessManagementMergeInput = {
  readonly merge: ProcessManagementThreeWayMerge;
  readonly resolution: ProcessManagementMergeResolution;
  readonly remoteConfig: ProcessManagementConfig;
  readonly remoteRevision: string;
};

/**
 * Second stage of `process pull`: applies a resolved whole-entity merge, writing
 * the merged config to local YAML and advancing the base to the remote
 * snapshot/revision. Never invoked when the user aborts resolution.
 */
export async function applyPulledProcessManagementMerge({
  container,
  input,
}: ProcessManagementServiceArgs<ApplyPulledProcessManagementMergeInput>): Promise<{
  readonly configText: string;
}> {
  const merged = wrapBusinessRuleError(() =>
    resolveProcessManagementMerge(input.merge, input.resolution),
  );
  const configText = serializeProcess(container, merged);
  await container.processManagementStorage.update(configText);
  await saveProcessManagementSnapshotAndRevision(
    container,
    input.remoteConfig,
    input.remoteRevision,
  );
  return { configText };
}
