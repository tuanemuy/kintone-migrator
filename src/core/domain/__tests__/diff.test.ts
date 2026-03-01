import { describe, expect, it } from "vitest";
import { buildDiffResult } from "../diff";

describe("buildDiffResult", () => {
  it("should count entries by type", () => {
    const entries = [
      { type: "added" as const, name: "a" },
      { type: "modified" as const, name: "b" },
      { type: "deleted" as const, name: "c" },
      { type: "added" as const, name: "d" },
    ];
    const result = buildDiffResult(entries);
    expect(result.summary.added).toBe(2);
    expect(result.summary.modified).toBe(1);
    expect(result.summary.deleted).toBe(1);
    expect(result.summary.total).toBe(4);
    expect(result.isEmpty).toBe(false);
  });

  it("should return isEmpty=true for empty entries", () => {
    const result = buildDiffResult([]);
    expect(result.isEmpty).toBe(true);
    expect(result.summary.total).toBe(0);
  });

  it("should sort entries in added -> modified -> deleted order", () => {
    const entries = [
      { type: "deleted" as const, name: "c" },
      { type: "added" as const, name: "a" },
      { type: "modified" as const, name: "b" },
      { type: "added" as const, name: "d" },
    ];
    const result = buildDiffResult(entries);
    expect(result.entries.map((e) => e.type)).toEqual([
      "added",
      "added",
      "modified",
      "deleted",
    ]);
  });

  it("should default warnings to empty array when not provided", () => {
    const entries = [{ type: "added" as const, name: "a" }];
    const result = buildDiffResult(entries);
    expect(result.warnings).toEqual([]);
  });

  it("should include warnings when provided", () => {
    const entries = [{ type: "added" as const, name: "a" }];
    const result = buildDiffResult(entries, ["some warning"]);
    expect(result.warnings).toEqual(["some warning"]);
  });

  it("should be isEmpty with warnings when entries are empty", () => {
    const result = buildDiffResult([], ["w1", "w2"]);
    expect(result.isEmpty).toBe(true);
    expect(result.warnings).toEqual(["w1", "w2"]);
  });
});
