import { deepEqual } from "@/lib/deepEqual";
import { buildDiffResult } from "../../diff";
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
      `chartMode: ${remote.chartMode ?? "default"} -> ${local.chartMode ?? "default"}`,
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
    const entries: ReportDiffEntry[] = [];

    for (const [name, localReport] of Object.entries(local.reports)) {
      const remoteReport = remote.reports[name];
      if (!remoteReport) {
        entries.push({
          type: "added",
          reportName: name,
          details: `chartType: ${localReport.chartType}`,
        });
      } else {
        const diffs = compareReports(localReport, remoteReport);
        if (diffs.length > 0) {
          entries.push({
            type: "modified",
            reportName: name,
            details: diffs.join(", "),
          });
        }
      }
    }

    for (const [name, remoteReport] of Object.entries(remote.reports)) {
      if (!local.reports[name]) {
        entries.push({
          type: "deleted",
          reportName: name,
          details: `chartType: ${remoteReport.chartType}`,
        });
      }
    }

    return buildDiffResult(entries);
  },
};
