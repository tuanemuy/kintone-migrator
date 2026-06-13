import type { ReportsConfig } from "@/core/domain/report/entity";
import { ReportStateSerializer } from "@/core/domain/report/services/reportStateSerializer";
import { saveAppRevision } from "../appRevisionIo";
import type { ReportDiffContainer } from "../container/report";
import { saveSnapshotState } from "../threeWay/stateIo";

/**
 * Persists the new base: the reports snapshot (state file) and the app revision
 * (`state/<appName>/revision.yaml`) side by side. The two writes are kept
 * together so they always advance as a pair (snapshot → revision).
 */
export async function saveReportSnapshotAndRevision(
  container: ReportDiffContainer,
  config: ReportsConfig,
  revision: string,
): Promise<void> {
  await saveSnapshotState(
    container.reportStateStorage,
    container.configCodec,
    ReportStateSerializer.serialize,
    { config },
  );
  await saveAppRevision(
    container.appRevisionStorage,
    container.configCodec,
    revision,
  );
}
