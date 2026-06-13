import { computeReportThreeWayMerge } from "@/core/domain/report/services/reportMerge";
import type { ReportServiceArgs } from "../container/report";
import { ValidationError, ValidationErrorCode } from "../error";
import { buildDriftConflict } from "../threeWay/driftConflict";
import { loadReportThreeWayInputs } from "./loadReportThreeWayInputs";
import { saveReportSnapshotAndRevision } from "./reportStateIo";

export type PushReportInput = {
  /** Skip drift checking and send no expected revision (revision-skip). */
  readonly force?: boolean;
};

export type PushReportOutput = {
  readonly mode: "push" | "firstTime";
  readonly revision: string;
};

/** Pull command name surfaced in the drift hint message. */
const REPORT_PULL_COMMAND = "report pull";

/**
 * Applies the local report config to the remote with drift detection and
 * optimistic concurrency control (AC-10).
 *
 * - Loads base/local/remote (the remote carries its own revision).
 * - drift (remoteOnly or conflict entries) && !force → {@link buildDriftConflict}
 *   tagged with `ConfigDrift`, distinguished from API optimistic-lock conflicts
 *   by error code (ADR-188-006).
 * - otherwise replaces the reports, sending the observed remote revision as the
 *   expected revision (TOCTOU guard, ADR-188-004). `--force` / first run send
 *   no revision (kintone skips the revision check).
 *
 * Deploy is performed by the CLI (`confirmAndDeploy`). State records the local
 * config and the post-apply revision as the new base (snapshot → revision).
 */
export async function pushReport({
  container,
  input,
}: ReportServiceArgs<PushReportInput>): Promise<PushReportOutput> {
  const { state, local, remote } = await loadReportThreeWayInputs(container);

  if (local === undefined) {
    throw new ValidationError(
      ValidationErrorCode.InvalidInput,
      "Report config file not found",
    );
  }

  const firstTime = state === undefined;

  if (!firstTime && !input.force) {
    const merge = computeReportThreeWayMerge(state, local, remote.config);
    const hasDrift = merge.entries.some(
      (e) => e.change.kind === "remoteOnly" || e.change.kind === "conflict",
    );
    if (hasDrift) {
      throw buildDriftConflict(REPORT_PULL_COMMAND);
    }
  }

  // Expected revision (ADR-188-004): the observed remote revision guards against
  // TOCTOU on a normal push. `--force` / first run omit it so the apply does not
  // fail on an unrelated concurrent change (kintone skips the revision check
  // when revision is undefined).
  const expectedRevision =
    input.force || firstTime ? undefined : remote.revision;

  const { revision: newRevision } =
    await container.reportConfigurator.updateReports({
      reports: local.reports,
      ...(expectedRevision !== undefined ? { revision: expectedRevision } : {}),
    });

  await saveReportSnapshotAndRevision(container, local, newRevision);

  return {
    mode: firstTime ? "firstTime" : "push",
    revision: newRevision,
  };
}
