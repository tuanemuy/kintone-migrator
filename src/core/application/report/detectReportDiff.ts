import { ReportDiffDetector } from "@/core/domain/report/services/diffDetector";
import type { ReportDiff } from "@/core/domain/report/valueObject";

export type { ReportDiffEntry } from "@/core/domain/report/valueObject";

import type { ReportDiffServiceArgs } from "../container/report";
import { detectDiffFromConfig } from "../detectDiffBase";
import { parseReportConfigText } from "./parseConfig";

export async function detectReportDiff({
  container,
}: ReportDiffServiceArgs): Promise<ReportDiff> {
  return detectDiffFromConfig({
    getStorage: () => container.reportStorage.get(),
    fetchRemote: () => container.reportConfigurator.getReports(),
    parseConfig: parseReportConfigText,
    detect: (local, remote) =>
      ReportDiffDetector.detect(local, { reports: remote.reports }),
    notFoundMessage: "Report config file not found",
  });
}
