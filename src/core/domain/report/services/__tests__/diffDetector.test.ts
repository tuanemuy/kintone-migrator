import { describe, expect, it } from "vitest";
import type { ReportConfig, ReportsConfig } from "../../entity";
import { ReportDiffDetector } from "../diffDetector";

function makeReport(overrides: Partial<ReportConfig> = {}): ReportConfig {
  return {
    chartType: "BAR",
    index: 0,
    name: "Test Report",
    groups: [],
    aggregations: [],
    filterCond: "",
    sorts: [],
    ...overrides,
  };
}

function makeConfig(reports: Record<string, ReportConfig> = {}): ReportsConfig {
  return { reports };
}

describe("ReportDiffDetector", () => {
  describe("no changes", () => {
    it("should return empty diff when reports are identical", () => {
      const config = makeConfig({ r1: makeReport() });
      const result = ReportDiffDetector.detect(config, config);
      expect(result.isEmpty).toBe(true);
      expect(result.entries).toHaveLength(0);
    });

    it("should return empty diff when both are empty", () => {
      const result = ReportDiffDetector.detect(makeConfig(), makeConfig());
      expect(result.isEmpty).toBe(true);
    });
  });

  describe("added reports", () => {
    it("should detect added report", () => {
      const local = makeConfig({ r1: makeReport() });
      const result = ReportDiffDetector.detect(local, makeConfig());
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].type).toBe("added");
      expect(result.entries[0].reportName).toBe("r1");
      expect(result.summary.added).toBe(1);
    });
  });

  describe("deleted reports", () => {
    it("should detect deleted report", () => {
      const remote = makeConfig({ r1: makeReport() });
      const result = ReportDiffDetector.detect(makeConfig(), remote);
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].type).toBe("deleted");
      expect(result.entries[0].reportName).toBe("r1");
      expect(result.summary.deleted).toBe(1);
    });
  });

  describe("modified reports", () => {
    it("should detect name change", () => {
      const local = makeConfig({
        r1: makeReport({ name: "New Name" }),
      });
      const remote = makeConfig({
        r1: makeReport({ name: "Test Report" }),
      });
      const result = ReportDiffDetector.detect(local, remote);
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].type).toBe("modified");
      expect(result.entries[0].details).toContain("name");
      expect(result.entries[0].details).toContain("New Name");
    });

    it("should detect chartType change", () => {
      const local = makeConfig({ r1: makeReport({ chartType: "PIE" }) });
      const remote = makeConfig({ r1: makeReport({ chartType: "BAR" }) });
      const result = ReportDiffDetector.detect(local, remote);
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].type).toBe("modified");
      expect(result.entries[0].details).toContain("chartType");
    });

    it("should detect groups change", () => {
      const local = makeConfig({
        r1: makeReport({ groups: [{ code: "field1" }] }),
      });
      const remote = makeConfig({ r1: makeReport({ groups: [] }) });
      const result = ReportDiffDetector.detect(local, remote);
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].details).toContain("groups");
    });

    it("should detect aggregations change", () => {
      const local = makeConfig({
        r1: makeReport({ aggregations: [{ type: "COUNT" }] }),
      });
      const remote = makeConfig({ r1: makeReport({ aggregations: [] }) });
      const result = ReportDiffDetector.detect(local, remote);
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].details).toContain("aggregations");
    });

    it("should detect sorts change", () => {
      const local = makeConfig({
        r1: makeReport({ sorts: [{ by: "TOTAL", order: "ASC" }] }),
      });
      const remote = makeConfig({ r1: makeReport({ sorts: [] }) });
      const result = ReportDiffDetector.detect(local, remote);
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].details).toContain("sorts");
    });

    it("should detect filterCond change", () => {
      const local = makeConfig({
        r1: makeReport({ filterCond: "status = 1" }),
      });
      const remote = makeConfig({ r1: makeReport({ filterCond: "" }) });
      const result = ReportDiffDetector.detect(local, remote);
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].details).toContain("filterCond");
    });

    it("should detect periodicReport change", () => {
      const local = makeConfig({
        r1: makeReport({
          periodicReport: {
            active: true,
            period: { every: "MONTH" },
          },
        }),
      });
      const remote = makeConfig({ r1: makeReport() });
      const result = ReportDiffDetector.detect(local, remote);
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].details).toContain("periodicReport");
    });

    it("should detect index change", () => {
      const local = makeConfig({ r1: makeReport({ index: 1 }) });
      const remote = makeConfig({ r1: makeReport({ index: 0 }) });
      const result = ReportDiffDetector.detect(local, remote);
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].details).toContain("index");
    });

    it("should detect chartMode change", () => {
      const local = makeConfig({ r1: makeReport({ chartMode: "STACKED" }) });
      const remote = makeConfig({ r1: makeReport({ chartMode: "NORMAL" }) });
      const result = ReportDiffDetector.detect(local, remote);
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].details).toContain("chartMode");
    });
  });

  describe("multiple changes", () => {
    it("should detect added, modified, and deleted simultaneously", () => {
      const local = makeConfig({
        existing: makeReport({ chartType: "PIE" }),
        new_report: makeReport({ name: "New" }),
      });
      const remote = makeConfig({
        existing: makeReport({ chartType: "BAR" }),
        old_report: makeReport({ name: "Old" }),
      });
      const result = ReportDiffDetector.detect(local, remote);
      expect(result.summary.added).toBe(1);
      expect(result.summary.modified).toBe(1);
      expect(result.summary.deleted).toBe(1);
      expect(result.summary.total).toBe(3);
      expect(result.isEmpty).toBe(false);
    });
  });
});
