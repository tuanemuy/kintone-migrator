import type { ReportConfig, ReportsConfig } from "../entity";
import type { ReportDiff, ReportDiffEntry } from "../valueObject";

function compareReports(local: ReportConfig, remote: ReportConfig): string[] {
  const diffs: string[] = [];

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
  if (JSON.stringify(local.groups) !== JSON.stringify(remote.groups)) {
    diffs.push("groups changed");
  }
  if (
    JSON.stringify(local.aggregations) !== JSON.stringify(remote.aggregations)
  ) {
    diffs.push("aggregations changed");
  }
  if (JSON.stringify(local.sorts) !== JSON.stringify(remote.sorts)) {
    diffs.push("sorts changed");
  }
  if (
    JSON.stringify(local.periodicReport ?? null) !==
    JSON.stringify(remote.periodicReport ?? null)
  ) {
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

    const added = entries.filter((e) => e.type === "added").length;
    const modified = entries.filter((e) => e.type === "modified").length;
    const deleted = entries.filter((e) => e.type === "deleted").length;

    return {
      entries,
      summary: { added, modified, deleted, total: added + modified + deleted },
      isEmpty: entries.length === 0,
    };
  },
};
