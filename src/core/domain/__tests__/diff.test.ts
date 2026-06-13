import { describe, expect, it } from "vitest";
import { buildDiffResult, classifyThreeWay } from "../diff";

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

describe("classifyThreeWay", () => {
  const eq = (a: string, b: string): boolean => a === b;
  const m = (entries: [string, string][]): Map<string, string> =>
    new Map(entries);

  function kindOf(
    result: ReturnType<typeof classifyThreeWay<string, string>>,
    key: string,
  ): string | undefined {
    return result.entries.find((e) => e.key === key)?.change.kind;
  }

  it("unchanged: no side diverged from base", () => {
    const r = classifyThreeWay(
      m([["k", "v"]]),
      m([["k", "v"]]),
      m([["k", "v"]]),
      eq,
    );
    expect(kindOf(r, "k")).toBe("unchanged");
    expect(r.entries.find((e) => e.key === "k")?.merged).toBe("v");
    expect(r.hasConflict).toBe(false);
  });

  it("localOnly: only local diverged", () => {
    const r = classifyThreeWay(
      m([["k", "v"]]),
      m([["k", "L"]]),
      m([["k", "v"]]),
      eq,
    );
    expect(kindOf(r, "k")).toBe("localOnly");
    expect(r.entries.find((e) => e.key === "k")?.merged).toBe("L");
  });

  it("remoteOnly: only remote diverged", () => {
    const r = classifyThreeWay(
      m([["k", "v"]]),
      m([["k", "v"]]),
      m([["k", "R"]]),
      eq,
    );
    expect(kindOf(r, "k")).toBe("remoteOnly");
    expect(r.entries.find((e) => e.key === "k")?.merged).toBe("R");
  });

  it("bothSame: both diverged to the same value", () => {
    const r = classifyThreeWay(
      m([["k", "v"]]),
      m([["k", "X"]]),
      m([["k", "X"]]),
      eq,
    );
    expect(kindOf(r, "k")).toBe("bothSame");
    expect(r.hasConflict).toBe(false);
  });

  it("conflict: both diverged to different values", () => {
    const r = classifyThreeWay(
      m([["k", "v"]]),
      m([["k", "L"]]),
      m([["k", "R"]]),
      eq,
    );
    expect(kindOf(r, "k")).toBe("conflict");
    expect(r.conflicts).toHaveLength(1);
    expect(r.hasConflict).toBe(true);
    expect(r.entries.find((e) => e.key === "k")?.merged).toBeUndefined();
  });

  it("addition on one side is localOnly/remoteOnly", () => {
    const r = classifyThreeWay(new Map(), m([["k", "L"]]), new Map(), eq);
    expect(kindOf(r, "k")).toBe("localOnly");
  });

  it("deletion on one side is localOnly/remoteOnly", () => {
    const r = classifyThreeWay(m([["k", "v"]]), new Map(), m([["k", "v"]]), eq);
    expect(kindOf(r, "k")).toBe("localOnly");
    expect(r.entries.find((e) => e.key === "k")?.merged).toBeUndefined();
  });

  it("deletion on both sides is bothSame", () => {
    const r = classifyThreeWay(m([["k", "v"]]), new Map(), new Map(), eq);
    expect(kindOf(r, "k")).toBe("bothSame");
    expect(r.hasConflict).toBe(false);
  });

  it("different additions on both sides is a conflict", () => {
    const r = classifyThreeWay(new Map(), m([["k", "L"]]), m([["k", "R"]]), eq);
    expect(kindOf(r, "k")).toBe("conflict");
  });

  it("same addition on both sides is bothSame", () => {
    const r = classifyThreeWay(new Map(), m([["k", "X"]]), m([["k", "X"]]), eq);
    expect(kindOf(r, "k")).toBe("bothSame");
  });
});
