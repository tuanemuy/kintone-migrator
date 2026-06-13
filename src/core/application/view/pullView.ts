import type { ViewsConfig } from "@/core/domain/view/entity";
import { ViewConfigSerializer } from "@/core/domain/view/services/configSerializer";
import {
  computeViewThreeWayMerge,
  resolveViewMerge,
  type ViewMergeResolution,
  type ViewThreeWayMerge,
} from "@/core/domain/view/services/viewMerge";
import type { ViewServiceArgs } from "../container/view";
import { wrapBusinessRuleError } from "../error";
import { stringifyConfig } from "../stringifyConfig";
import { loadViewThreeWayInputs } from "./loadViewThreeWayInputs";
import { saveViewSnapshotAndRevision } from "./viewStateIo";

export type PullViewInput = {
  /** Overwrite local with remote (capture-equivalent), bypassing merge. */
  readonly force?: boolean;
};

export type PullViewOutput =
  | { readonly mode: "force"; readonly configText: string }
  | { readonly mode: "firstTime"; readonly configText: string }
  | {
      readonly mode: "merged";
      readonly merge: ViewThreeWayMerge;
      readonly remoteConfig: ViewsConfig;
      readonly remoteRevision: string;
    };

function serializeViews(
  container: ViewServiceArgs["container"],
  config: ViewsConfig,
): string {
  return stringifyConfig(
    container.configCodec,
    ViewConfigSerializer.serialize(config),
  );
}

/**
 * First stage of `view pull` (AC-11).
 *
 * - `force`: returns the remote snapshot for local overwrite (capture-equiv).
 * - first run (no state): returns remote for one-way overwrite.
 * - otherwise: computes the 3-way merge and returns it for conflict resolution
 *   by the CLI. The local YAML / state are NOT written here — that happens in
 *   {@link applyPulledViewMerge} after resolution, so an aborted resolution
 *   leaves local and state untouched (AC-11).
 *
 * This stage never writes to the remote (pull is read-only against kintone).
 */
export async function pullView({
  container,
  input,
}: ViewServiceArgs<PullViewInput>): Promise<PullViewOutput> {
  const { state, local, remote } = await loadViewThreeWayInputs(container);

  if (input.force || state === undefined || local === undefined) {
    // force / first run / no local: one-way overwrite from the remote and
    // (re)initialize the base. The remote is the source of truth here.
    const configText = serializeViews(container, remote.config);
    await container.viewStorage.update(configText);
    await saveViewSnapshotAndRevision(
      container,
      remote.config,
      remote.revision,
    );
    return {
      mode: input.force ? "force" : "firstTime",
      configText,
    };
  }

  const merge = computeViewThreeWayMerge(state, local, remote.config);

  return {
    mode: "merged",
    merge,
    remoteConfig: remote.config,
    remoteRevision: remote.revision,
  };
}

export type ApplyPulledViewMergeInput = {
  readonly merge: ViewThreeWayMerge;
  readonly resolution: ViewMergeResolution;
  readonly remoteConfig: ViewsConfig;
  readonly remoteRevision: string;
};

/**
 * Second stage of `view pull`: applies a resolved 3-way merge.
 *
 * Writes the merged config to the local YAML and updates the base to the remote
 * snapshot/revision. Called only after the CLI has fully resolved all conflicts;
 * if the user aborts resolution this is never invoked, so local and state remain
 * unchanged (AC-11).
 */
export async function applyPulledViewMerge({
  container,
  input,
}: ViewServiceArgs<ApplyPulledViewMergeInput>): Promise<{
  readonly configText: string;
}> {
  // resolveViewMerge throws a BusinessRuleError when the resolution does not
  // cover every conflict (programmer invariant); translate it to a
  // ValidationError per the error policy (domain → application).
  const merged = wrapBusinessRuleError(() =>
    resolveViewMerge(input.merge, input.resolution),
  );
  const configText = serializeViews(container, merged);
  await container.viewStorage.update(configText);
  await saveViewSnapshotAndRevision(
    container,
    input.remoteConfig,
    input.remoteRevision,
  );
  return { configText };
}
