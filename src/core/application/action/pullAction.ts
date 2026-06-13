import type { ActionsConfig } from "@/core/domain/action/entity";
import {
  type ActionMergeResolution,
  type ActionThreeWayMerge,
  computeActionThreeWayMerge,
  resolveActionMerge,
} from "@/core/domain/action/services/actionMerge";
import { ActionConfigSerializer } from "@/core/domain/action/services/configSerializer";
import type { ActionServiceArgs } from "../container/action";
import { wrapBusinessRuleError } from "../error";
import { stringifyConfig } from "../stringifyConfig";
import { saveActionSnapshotAndRevision } from "./actionStateIo";
import { loadActionThreeWayInputs } from "./loadActionThreeWayInputs";

export type PullActionInput = {
  /** Overwrite local with remote (capture-equivalent), bypassing merge. */
  readonly force?: boolean;
};

export type PullActionOutput =
  | { readonly mode: "force"; readonly configText: string }
  | { readonly mode: "firstTime"; readonly configText: string }
  | {
      readonly mode: "merged";
      readonly merge: ActionThreeWayMerge;
      readonly remoteConfig: ActionsConfig;
      readonly remoteRevision: string;
    };

function serializeActions(
  container: ActionServiceArgs["container"],
  config: ActionsConfig,
): string {
  return stringifyConfig(
    container.configCodec,
    ActionConfigSerializer.serialize(config),
  );
}

/**
 * First stage of `action pull` (AC-11).
 *
 * - `force`: returns the remote snapshot for local overwrite (capture-equiv).
 * - first run (no state): returns remote for one-way overwrite.
 * - otherwise: computes the 3-way merge and returns it for conflict resolution
 *   by the CLI. The local YAML / state are NOT written here — that happens in
 *   {@link applyPulledActionMerge} after resolution, so an aborted resolution
 *   leaves local and state untouched (AC-11).
 *
 * This stage never writes to the remote (pull is read-only against kintone).
 */
export async function pullAction({
  container,
  input,
}: ActionServiceArgs<PullActionInput>): Promise<PullActionOutput> {
  const { state, local, remote } = await loadActionThreeWayInputs(container);

  if (input.force || state === undefined || local === undefined) {
    // force / first run / no local: one-way overwrite from the remote and
    // (re)initialize the base. The remote is the source of truth here.
    const configText = serializeActions(container, remote.config);
    await container.actionStorage.update(configText);
    await saveActionSnapshotAndRevision(
      container,
      remote.config,
      remote.revision,
    );
    return {
      mode: input.force ? "force" : "firstTime",
      configText,
    };
  }

  const merge = computeActionThreeWayMerge(state, local, remote.config);

  return {
    mode: "merged",
    merge,
    remoteConfig: remote.config,
    remoteRevision: remote.revision,
  };
}

export type ApplyPulledActionMergeInput = {
  readonly merge: ActionThreeWayMerge;
  readonly resolution: ActionMergeResolution;
  readonly remoteConfig: ActionsConfig;
  readonly remoteRevision: string;
};

/**
 * Second stage of `action pull`: applies a resolved 3-way merge.
 *
 * Writes the merged config to the local YAML and updates the base to the remote
 * snapshot/revision. Called only after the CLI has fully resolved all conflicts;
 * if the user aborts resolution this is never invoked, so local and state remain
 * unchanged (AC-11).
 */
export async function applyPulledActionMerge({
  container,
  input,
}: ActionServiceArgs<ApplyPulledActionMergeInput>): Promise<{
  readonly configText: string;
}> {
  // resolveActionMerge throws a BusinessRuleError when the resolution does not
  // cover every conflict (programmer invariant); translate it to a
  // ValidationError per the error policy (domain → application).
  const merged = wrapBusinessRuleError(() =>
    resolveActionMerge(input.merge, input.resolution),
  );
  const configText = serializeActions(container, merged);
  await container.actionStorage.update(configText);
  await saveActionSnapshotAndRevision(
    container,
    input.remoteConfig,
    input.remoteRevision,
  );
  return { configText };
}
