import { describe, expect, it } from "vitest";
import { configCodec } from "@/core/adapters/yaml/configCodec";
import { setupTestReportContainer } from "@/core/application/__tests__/helpers";
import type { TestReportContainer } from "@/core/application/__tests__/helpers/report";
import type { ReportConfig, ReportsConfig } from "@/core/domain/report/entity";
import { ReportStateSerializer } from "@/core/domain/report/services/reportStateSerializer";
import { applyPulledReportMerge, pullReport } from "../pullReport";

function report(
  name: string,
  overrides: Partial<ReportConfig> = {},
): ReportConfig {
  return {
    chartType: "BAR",
    index: 0,
    name,
    groups: [],
    aggregations: [{ type: "COUNT" }],
    filterCond: "",
    sorts: [],
    ...overrides,
  };
}

function reportYaml(filterCond: string): string {
  return `reports:\n  集計:\n    chartType: BAR\n    index: 0\n    groups: []\n    aggregations:\n      - type: COUNT\n    filterCond: "${filterCond}"\n    sorts: []\n`;
}

function setState(
  container: TestReportContainer,
  config: ReportsConfig,
  revision: string,
): void {
  container.reportStateStorage.setContent(
    configCodec.stringify(ReportStateSerializer.serialize({ config })),
  );
  container.appRevisionStorage.setContent(configCodec.stringify({ revision }));
}

const baseConfig: ReportsConfig = {
  reports: { 集計: report("集計", { filterCond: "" }) },
};

describe("pullReport", () => {
  const getContainer = setupTestReportContainer();

  it("first run (no state) overwrites local from remote and initializes state", async () => {
    const container = getContainer();
    container.reportConfigurator.setReports(
      { 集計: report("集計", { filterCond: "remote" }) },
      "7",
    );

    const result = await pullReport({ container, input: {} });

    expect(result.mode).toBe("firstTime");
    expect(container.reportStorage.callLog).toContain("update");
    expect(container.appRevisionStorage.callLog).toContain("update");
  });

  it("force overwrites local from remote (capture-equivalent)", async () => {
    const container = getContainer();
    setState(container, baseConfig, "1");
    container.reportStorage.setContent(reportYaml("local"));
    container.reportConfigurator.setReports(
      { 集計: report("集計", { filterCond: "remote" }) },
      "2",
    );

    const result = await pullReport({ container, input: { force: true } });

    expect(result.mode).toBe("force");
  });

  it("returns the merge for resolution without writing local/state", async () => {
    const container = getContainer();
    setState(container, baseConfig, "1");
    container.reportStorage.setContent(reportYaml("local"));
    container.reportConfigurator.setReports(
      { 集計: report("集計", { filterCond: "remote" }) },
      "2",
    );

    const result = await pullReport({ container, input: {} });

    expect(result.mode).toBe("merged");
    expect(container.reportStorage.callLog).not.toContain("update");
    expect(container.reportStateStorage.callLog).not.toContain("update");
  });

  it("applyPulledReportMerge writes the merged config and advances state", async () => {
    const container = getContainer();
    setState(container, baseConfig, "1");
    container.reportStorage.setContent(reportYaml("local"));
    const remoteConfig: ReportsConfig = {
      reports: { 集計: report("集計", { filterCond: "remote" }) },
    };
    container.reportConfigurator.setReports(remoteConfig.reports, "2");

    const pull = await pullReport({ container, input: {} });
    if (pull.mode !== "merged") throw new Error("expected merged");

    await applyPulledReportMerge({
      container,
      input: {
        merge: pull.merge,
        resolution: new Map([["集計", "remote"]]),
        remoteConfig: pull.remoteConfig,
        remoteRevision: pull.remoteRevision,
      },
    });

    expect(container.reportStorage.callLog).toContain("update");
    expect(container.appRevisionStorage.callLog).toContain("update");
  });
});
