import type { GeneralSettingsConfig } from "@/core/domain/generalSettings/entity";
import { GeneralSettingsConfigSerializer } from "@/core/domain/generalSettings/services/configSerializer";
import {
  computeGeneralSettingsThreeWayMerge,
  type GeneralSettingsMergeResolution,
  type GeneralSettingsThreeWayMerge,
  resolveGeneralSettingsMerge,
} from "@/core/domain/generalSettings/services/generalSettingsMerge";
import type { GeneralSettingsServiceArgs } from "../container/generalSettings";
import { wrapBusinessRuleError } from "../error";
import { stringifyConfig } from "../stringifyConfig";
import { saveGeneralSettingsSnapshotAndRevision } from "./generalSettingsStateIo";
import { loadGeneralSettingsThreeWayInputs } from "./loadGeneralSettingsThreeWayInputs";

export type PullGeneralSettingsInput = {
  /** Overwrite local with remote (capture-equivalent), bypassing merge. */
  readonly force?: boolean;
};

export type PullGeneralSettingsOutput =
  | { readonly mode: "force"; readonly configText: string }
  | { readonly mode: "firstTime"; readonly configText: string }
  | {
      readonly mode: "merged";
      readonly merge: GeneralSettingsThreeWayMerge;
      readonly remoteConfig: GeneralSettingsConfig;
      readonly remoteRevision: string;
    };

function serializeSettings(
  container: GeneralSettingsServiceArgs["container"],
  config: GeneralSettingsConfig,
): string {
  return stringifyConfig(
    container.configCodec,
    GeneralSettingsConfigSerializer.serialize(config),
  );
}

/**
 * First stage of `settings pull`.
 *
 * - `force`: returns the remote snapshot for local overwrite (capture-equiv).
 * - first run (no state): returns remote for one-way overwrite.
 * - otherwise: computes the whole-entity 3-way merge and returns it for conflict
 *   resolution by the CLI. The local YAML / state are NOT written here — that
 *   happens in {@link applyPulledGeneralSettingsMerge} after resolution, so an
 *   aborted resolution leaves local and state untouched.
 *
 * This stage never writes to the remote (pull is read-only against kintone).
 */
export async function pullGeneralSettings({
  container,
  input,
}: GeneralSettingsServiceArgs<PullGeneralSettingsInput>): Promise<PullGeneralSettingsOutput> {
  const { state, local, remote } =
    await loadGeneralSettingsThreeWayInputs(container);

  if (input.force || state === undefined || local === undefined) {
    const configText = serializeSettings(container, remote.config);
    await container.generalSettingsStorage.update(configText);
    await saveGeneralSettingsSnapshotAndRevision(
      container,
      remote.config,
      remote.revision,
    );
    return {
      mode: input.force ? "force" : "firstTime",
      configText,
    };
  }

  const merge = computeGeneralSettingsThreeWayMerge(
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

export type ApplyPulledGeneralSettingsMergeInput = {
  readonly merge: GeneralSettingsThreeWayMerge;
  readonly resolution: GeneralSettingsMergeResolution;
  readonly remoteConfig: GeneralSettingsConfig;
  readonly remoteRevision: string;
};

/**
 * Second stage of `settings pull`: applies a resolved whole-entity merge.
 *
 * Writes the merged config to the local YAML and updates the base to the remote
 * snapshot/revision. Called only after the CLI has fully resolved the conflict;
 * if the user aborts resolution this is never invoked, so local and state remain
 * unchanged.
 */
export async function applyPulledGeneralSettingsMerge({
  container,
  input,
}: GeneralSettingsServiceArgs<ApplyPulledGeneralSettingsMergeInput>): Promise<{
  readonly configText: string;
}> {
  const merged = wrapBusinessRuleError(() =>
    resolveGeneralSettingsMerge(input.merge, input.resolution),
  );
  const configText = serializeSettings(container, merged);
  await container.generalSettingsStorage.update(configText);
  await saveGeneralSettingsSnapshotAndRevision(
    container,
    input.remoteConfig,
    input.remoteRevision,
  );
  return { configText };
}
