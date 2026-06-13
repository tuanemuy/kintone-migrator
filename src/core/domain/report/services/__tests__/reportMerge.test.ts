import { describe, expect, it } from "vitest";
import type { ReportConfig, ReportsConfig } from "../../entity";
import {
  computeReportThreeWayMerge,
  isReportConfigEqual,
  resolveReportMerge,
} from "../reportMerge";

function report(
  key: string,
  overrides: Partial<ReportConfig> = {},
): ReportConfig {
  return {
    chartType: "BAR",
    index: 0,
    name: key,
    groups: [],
    aggregations: [],
    filterCond: "",
    sorts: [],
    ...overrides,
  };
}

function config(...reports: ReportConfig[]): ReportsConfig {
  // The map key is the YAML object key, which can diverge from `name` when an
  // explicit `name:` override is hand-edited into the config. Key by an explicit
  // first element so divergence between key and `name` is representable.
  return {
    reports: Object.fromEntries(reports.map((r) => [r.name, r])),
  };
}

describe("isReportConfigEqual", () => {
  it("treats undefined and empty string as equal for chartMode", () => {
    expect(
      isReportConfigEqual(
        report("a", { chartMode: undefined }),
        report("a", { chartMode: undefined }),
      ),
    ).toBe(true);
  });

  it("compares name (matches the 2-way diffDetector granularity)", () => {
    // Same record key, but the parsed `name` (a `name:` override) differs.
    // The 2-way compareReports detects this; the eq must too, otherwise a
    // hand-edited name-only change is silently dropped in the 3-way merge.
    expect(
      isReportConfigEqual(
        { ...report("a"), name: "Alpha" },
        { ...report("a"), name: "Beta" },
      ),
    ).toBe(false);
  });

  it("treats identical configs as equal", () => {
    expect(isReportConfigEqual(report("a"), report("a"))).toBe(true);
  });
});

describe("computeReportThreeWayMerge", () => {
  it("classifies a local-only name override change", () => {
    // Stable record key "a"; only the explicit `name` diverges locally.
    const base = { reports: { a: { ...report("a"), name: "Alpha" } } };
    const local = { reports: { a: { ...report("a"), name: "Local" } } };
    const remote = { reports: { a: { ...report("a"), name: "Alpha" } } };

    const merge = computeReportThreeWayMerge(base, local, remote);

    expect(merge.hasConflict).toBe(false);
    const entry = merge.entries.find((e) => e.key === "a");
    expect(entry?.change.kind).toBe("localOnly");
  });

  it("classifies divergent name changes as a conflict", () => {
    const base = { reports: { a: { ...report("a"), name: "Alpha" } } };
    const local = { reports: { a: { ...report("a"), name: "Local" } } };
    const remote = { reports: { a: { ...report("a"), name: "Remote" } } };

    const merge = computeReportThreeWayMerge(base, local, remote);

    expect(merge.hasConflict).toBe(true);
    expect(merge.conflicts.map((c) => c.key)).toEqual(["a"]);
  });

  it("classifies a local-only chartType change", () => {
    const base = config(report("a", { chartType: "BAR" }));
    const local = config(report("a", { chartType: "PIE" }));
    const remote = config(report("a", { chartType: "BAR" }));

    const merge = computeReportThreeWayMerge(base, local, remote);

    const entry = merge.entries.find((e) => e.key === "a");
    expect(entry?.change.kind).toBe("localOnly");
  });
});

describe("resolveReportMerge", () => {
  it("keeps an auto-merged local-only name override change", () => {
    const base = { reports: { a: { ...report("a"), name: "Alpha" } } };
    const local = { reports: { a: { ...report("a"), name: "Local" } } };
    const remote = { reports: { a: { ...report("a"), name: "Alpha" } } };
    const merge = computeReportThreeWayMerge(base, local, remote);

    const resolved = resolveReportMerge(merge, new Map());

    expect(resolved.reports.a.name).toBe("Local");
  });
});
