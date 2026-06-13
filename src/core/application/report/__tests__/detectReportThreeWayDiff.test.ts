import { describe, expect, it } from "vitest";
import { configCodec } from "@/core/adapters/yaml/configCodec";
import { setupTestReportContainer } from "@/core/application/__tests__/helpers";
import type { TestReportContainer } from "@/core/application/__tests__/helpers/report";
import type { ReportConfig, ReportsConfig } from "@/core/domain/report/entity";
import { ReportStateSerializer } from "@/core/domain/report/services/reportStateSerializer";
import { detectReportThreeWayDiff } from "../detectReportThreeWayDiff";

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

describe("detectReportThreeWayDiff", () => {
  const getContainer = setupTestReportContainer();

  it("falls back to 2-way when no state exists", async () => {
    const container = getContainer();
    container.reportStorage.setContent(reportYaml("local"));
    container.reportConfigurator.setReports(baseConfig.reports, "1");

    const result = await detectReportThreeWayDiff({ container });

    expect(result.mode).toBe("two-way");
  });

  it("classifies a local-only change", async () => {
    const container = getContainer();
    setState(container, baseConfig, "1");
    container.reportStorage.setContent(reportYaml("local"));
    container.reportConfigurator.setReports(baseConfig.reports, "1");

    const result = await detectReportThreeWayDiff({ container });

    expect(result.mode).toBe("three-way");
    if (result.mode === "three-way") {
      expect(result.localChanges.map((e) => e.key)).toContain("集計");
      expect(result.conflicts).toHaveLength(0);
    }
  });

  it("classifies remote drift", async () => {
    const container = getContainer();
    setState(container, baseConfig, "1");
    container.reportStorage.setContent(reportYaml(""));
    container.reportConfigurator.setReports(
      { 集計: report("集計", { filterCond: "remote" }) },
      "2",
    );

    const result = await detectReportThreeWayDiff({ container });

    expect(result.mode).toBe("three-way");
    if (result.mode === "three-way") {
      expect(result.remoteDrift.map((e) => e.key)).toContain("集計");
    }
  });

  it("classifies a conflict", async () => {
    const container = getContainer();
    setState(container, baseConfig, "1");
    container.reportStorage.setContent(reportYaml("local"));
    container.reportConfigurator.setReports(
      { 集計: report("集計", { filterCond: "remote" }) },
      "2",
    );

    const result = await detectReportThreeWayDiff({ container });

    expect(result.mode).toBe("three-way");
    if (result.mode === "three-way") {
      expect(result.conflicts.map((e) => e.key)).toContain("集計");
    }
  });
});
