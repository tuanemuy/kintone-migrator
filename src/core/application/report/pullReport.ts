import type { ReportsConfig } from "@/core/domain/report/entity";
import { ReportConfigSerializer } from "@/core/domain/report/services/configSerializer";
import {
  computeReportThreeWayMerge,
  type ReportMergeResolution,
  type ReportThreeWayMerge,
  resolveReportMerge,
} from "@/core/domain/report/services/reportMerge";
import type { ReportServiceArgs } from "../container/report";
import { wrapBusinessRuleError } from "../error";
import { stringifyConfig } from "../stringifyConfig";
import { loadReportThreeWayInputs } from "./loadReportThreeWayInputs";
import { saveReportSnapshotAndRevision } from "./reportStateIo";

export type PullReportInput = {
  /** Overwrite local with remote (capture-equivalent), bypassing merge. */
  readonly force?: boolean;
};

export type PullReportOutput =
  | { readonly mode: "force"; readonly configText: string }
  | { readonly mode: "firstTime"; readonly configText: string }
  | {
      readonly mode: "merged";
      readonly merge: ReportThreeWayMerge;
      readonly remoteConfig: ReportsConfig;
      readonly remoteRevision: string;
    };

function serializeReports(
  container: ReportServiceArgs["container"],
  config: ReportsConfig,
): string {
  return stringifyConfig(
    container.configCodec,
    ReportConfigSerializer.serialize(config),
  );
}

/**
 * First stage of `report pull` (AC-11).
 *
 * - `force`: returns the remote snapshot for local overwrite (capture-equiv).
 * - first run (no state): returns remote for one-way overwrite.
 * - otherwise: computes the 3-way merge and returns it for conflict resolution
 *   by the CLI. The local YAML / state are NOT written here — that happens in
 *   {@link applyPulledReportMerge} after resolution, so an aborted resolution
 *   leaves local and state untouched (AC-11).
 *
 * This stage never writes to the remote (pull is read-only against kintone).
 */
export async function pullReport({
  container,
  input,
}: ReportServiceArgs<PullReportInput>): Promise<PullReportOutput> {
  const { state, local, remote } = await loadReportThreeWayInputs(container);

  if (input.force || state === undefined || local === undefined) {
    // force / first run / no local: one-way overwrite from the remote and
    // (re)initialize the base. The remote is the source of truth here.
    const configText = serializeReports(container, remote.config);
    await container.reportStorage.update(configText);
    await saveReportSnapshotAndRevision(
      container,
      remote.config,
      remote.revision,
    );
    return {
      mode: input.force ? "force" : "firstTime",
      configText,
    };
  }

  const merge = computeReportThreeWayMerge(state, local, remote.config);

  return {
    mode: "merged",
    merge,
    remoteConfig: remote.config,
    remoteRevision: remote.revision,
  };
}

export type ApplyPulledReportMergeInput = {
  readonly merge: ReportThreeWayMerge;
  readonly resolution: ReportMergeResolution;
  readonly remoteConfig: ReportsConfig;
  readonly remoteRevision: string;
};

/**
 * Second stage of `report pull`: applies a resolved 3-way merge.
 *
 * Writes the merged config to the local YAML and updates the base to the remote
 * snapshot/revision. Called only after the CLI has fully resolved all conflicts;
 * if the user aborts resolution this is never invoked, so local and state remain
 * unchanged (AC-11).
 */
export async function applyPulledReportMerge({
  container,
  input,
}: ReportServiceArgs<ApplyPulledReportMergeInput>): Promise<{
  readonly configText: string;
}> {
  // resolveReportMerge throws a BusinessRuleError when the resolution does not
  // cover every conflict (programmer invariant); translate it to a
  // ValidationError per the error policy (domain → application).
  const merged = wrapBusinessRuleError(() =>
    resolveReportMerge(input.merge, input.resolution),
  );
  const configText = serializeReports(container, merged);
  await container.reportStorage.update(configText);
  await saveReportSnapshotAndRevision(
    container,
    input.remoteConfig,
    input.remoteRevision,
  );
  return { configText };
}
