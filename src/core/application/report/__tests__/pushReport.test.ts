import { describe, expect, it } from "vitest";
import { configCodec } from "@/core/adapters/yaml/configCodec";
import { setupTestReportContainer } from "@/core/application/__tests__/helpers";
import type { TestReportContainer } from "@/core/application/__tests__/helpers/report";
import {
  ConflictError,
  ConflictErrorCode,
  isValidationError,
} from "@/core/application/error";
import type { ReportConfig, ReportsConfig } from "@/core/domain/report/entity";
import { ReportStateSerializer } from "@/core/domain/report/services/reportStateSerializer";
import { pushReport } from "../pushReport";

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

describe("pushReport", () => {
  const getContainer = setupTestReportContainer();

  it("throws ValidationError when the local config file is missing", async () => {
    const container = getContainer();
    container.reportConfigurator.setReports(baseConfig.reports, "1");

    await expect(pushReport({ container, input: {} })).rejects.toSatisfy(
      isValidationError,
    );
  });

  it("applies the local config and sends the observed revision as expected", async () => {
    const container = getContainer();
    setState(container, baseConfig, "1");
    container.reportStorage.setContent(reportYaml("local"));
    container.reportConfigurator.setReports(baseConfig.reports, "1");

    const result = await pushReport({ container, input: {} });

    expect(result.mode).toBe("push");
    expect(container.reportConfigurator.lastUpdateParams?.revision).toBe("1");
    expect(container.appRevisionStorage.callLog).toContain("update");
  });

  it("rejects with a ConfigDrift ConflictError when the remote drifted", async () => {
    const container = getContainer();
    setState(container, baseConfig, "1");
    container.reportStorage.setContent(reportYaml("local"));
    container.reportConfigurator.setReports(
      { 集計: report("集計", { filterCond: "remote" }) },
      "2",
    );

    await expect(pushReport({ container, input: {} })).rejects.toSatisfy(
      (e: unknown) =>
        e instanceof ConflictError && e.code === ConflictErrorCode.ConfigDrift,
    );
    expect(container.reportConfigurator.callLog).not.toContain("updateReports");
  });

  it("force skips the drift check and sends no expected revision", async () => {
    const container = getContainer();
    setState(container, baseConfig, "1");
    container.reportStorage.setContent(reportYaml("local"));
    container.reportConfigurator.setReports(
      { 集計: report("集計", { filterCond: "remote" }) },
      "2",
    );

    const result = await pushReport({ container, input: { force: true } });

    expect(result.mode).toBe("push");
    expect(
      container.reportConfigurator.lastUpdateParams?.revision,
    ).toBeUndefined();
  });

  it("first run (no state) applies without a revision guard and initializes state", async () => {
    const container = getContainer();
    container.reportStorage.setContent(reportYaml(""));
    container.reportConfigurator.setReports(baseConfig.reports, "5");

    const result = await pushReport({ container, input: {} });

    expect(result.mode).toBe("firstTime");
    expect(
      container.reportConfigurator.lastUpdateParams?.revision,
    ).toBeUndefined();
    expect(container.reportStateStorage.callLog).toContain("update");
    expect(container.appRevisionStorage.callLog).toContain("update");
  });
});
