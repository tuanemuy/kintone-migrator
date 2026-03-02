import { deepEqual } from "@/lib/deepEqual";
import { buildDiffResult } from "../../diff";
import { detectRecordDiff } from "../../services/recordDiffDetector";
import type { ReportConfig, ReportsConfig } from "../entity";
import type { ReportDiff, ReportDiffEntry } from "../valueObject";

function compareReports(local: ReportConfig, remote: ReportConfig): string[] {
  const diffs: string[] = [];

  if (local.name !== remote.name) {
    diffs.push(`name: "${remote.name}" -> "${local.name}"`);
  }
  if (local.chartType !== remote.chartType) {
    diffs.push(`chartType: ${remote.chartType} -> ${local.chartType}`);
  }
  if ((local.chartMode ?? "") !== (remote.chartMode ?? "")) {
    diffs.push(
      `chartMode: ${remote.chartMode ?? "(unset)"} -> ${local.chartMode ?? "(unset)"}`,
    );
  }
  if (local.index !== remote.index) {
    diffs.push(`index: ${remote.index} -> ${local.index}`);
  }
  if (local.filterCond !== remote.filterCond) {
    diffs.push("filterCond changed");
  }
  if (!deepEqual(local.groups, remote.groups)) {
    diffs.push("groups changed");
  }
  if (!deepEqual(local.aggregations, remote.aggregations)) {
    diffs.push("aggregations changed");
  }
  if (!deepEqual(local.sorts, remote.sorts)) {
    diffs.push("sorts changed");
  }
  if (!deepEqual(local.periodicReport ?? null, remote.periodicReport ?? null)) {
    diffs.push("periodicReport changed");
  }

  return diffs;
}

export const ReportDiffDetector = {
  detect: (local: ReportsConfig, remote: ReportsConfig): ReportDiff => {
    const entries = detectRecordDiff<ReportConfig, ReportDiffEntry>(
      local.reports,
      remote.reports,
      {
        onAdded: (name, localReport) => ({
          type: "added",
          reportName: name,
          details: `chartType: ${localReport.chartType}`,
        }),
        onModified: (name, localReport, remoteReport) => {
          const diffs = compareReports(localReport, remoteReport);
          if (diffs.length > 0) {
            return {
              type: "modified",
              reportName: name,
              details: diffs.join(", "),
            };
          }
          return undefined;
        },
        onDeleted: (name, remoteReport) => ({
          type: "deleted",
          reportName: name,
          details: `chartType: ${remoteReport.chartType}`,
        }),
      },
    );

    return buildDiffResult(entries);
  },
};
