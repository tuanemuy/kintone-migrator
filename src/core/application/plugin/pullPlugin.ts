import type { PluginsConfig } from "@/core/domain/plugin/entity";
import { PluginConfigSerializer } from "@/core/domain/plugin/services/configSerializer";
import {
  computePluginThreeWayMerge,
  type PluginMergeResolution,
  type PluginThreeWayMerge,
  resolvePluginMerge,
} from "@/core/domain/plugin/services/pluginMerge";
import type { PluginServiceArgs } from "../container/plugin";
import { wrapBusinessRuleError } from "../error";
import { stringifyConfig } from "../stringifyConfig";
import { loadPluginThreeWayInputs } from "./loadPluginThreeWayInputs";
import { savePluginSnapshotAndRevision } from "./pluginStateIo";

export type PullPluginInput = {
  /** Overwrite local with remote (capture-equivalent), bypassing merge. */
  readonly force?: boolean;
};

export type PullPluginOutput =
  | { readonly mode: "force"; readonly configText: string }
  | { readonly mode: "firstTime"; readonly configText: string }
  | {
      readonly mode: "merged";
      readonly merge: PluginThreeWayMerge;
      readonly remoteConfig: PluginsConfig;
      readonly remoteRevision: string;
    };

function serializePlugins(
  container: PluginServiceArgs["container"],
  config: PluginsConfig,
): string {
  return stringifyConfig(
    container.configCodec,
    PluginConfigSerializer.serialize(config),
  );
}

/**
 * First stage of `plugin pull` (AC-8 / AC-11). Equivalent to `capture` on
 * `--force` / first run.
 *
 * - `force`: returns the remote snapshot for local overwrite (capture-equiv).
 * - first run (no state): returns remote for one-way overwrite.
 * - otherwise: computes the record-keyed 3-way merge and returns it for conflict
 *   resolution by the CLI. The local YAML / state are NOT written here — that
 *   happens in {@link applyPulledPluginMerge} after resolution, so an aborted
 *   resolution leaves local and state untouched (AC-11).
 *
 * This stage never writes to the remote (pull is read-only against kintone).
 */
export async function pullPlugin({
  container,
  input,
}: PluginServiceArgs<PullPluginInput>): Promise<PullPluginOutput> {
  const { state, local, remote } = await loadPluginThreeWayInputs(container);

  if (input.force || state === undefined || local === undefined) {
    const configText = serializePlugins(container, remote.config);
    await container.pluginStorage.update(configText);
    await savePluginSnapshotAndRevision(
      container,
      remote.config,
      remote.revision,
    );
    return {
      mode: input.force ? "force" : "firstTime",
      configText,
    };
  }

  const merge = computePluginThreeWayMerge(state, local, remote.config);

  return {
    mode: "merged",
    merge,
    remoteConfig: remote.config,
    remoteRevision: remote.revision,
  };
}

export type ApplyPulledPluginMergeInput = {
  readonly merge: PluginThreeWayMerge;
  readonly resolution: PluginMergeResolution;
  readonly remoteConfig: PluginsConfig;
  readonly remoteRevision: string;
};

/**
 * Second stage of `plugin pull`: applies a resolved 3-way merge.
 *
 * Writes the merged config to the local YAML and updates the base to the remote
 * snapshot/revision. Called only after the CLI has fully resolved all conflicts;
 * if the user aborts resolution this is never invoked, so local and state remain
 * unchanged (AC-11).
 */
export async function applyPulledPluginMerge({
  container,
  input,
}: PluginServiceArgs<ApplyPulledPluginMergeInput>): Promise<{
  readonly configText: string;
}> {
  const merged = wrapBusinessRuleError(() =>
    resolvePluginMerge(input.merge, input.resolution),
  );
  const configText = serializePlugins(container, merged);
  await container.pluginStorage.update(configText);
  await savePluginSnapshotAndRevision(
    container,
    input.remoteConfig,
    input.remoteRevision,
  );
  return { configText };
}
