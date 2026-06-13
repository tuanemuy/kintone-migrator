import { describe, expect, it } from "vitest";
import { BusinessRuleError } from "../error";
import { computeSingleThreeWayMerge, resolveSingleMerge } from "../singleMerge";

type Box = { v: number };

const eq = (a: Box, b: Box): boolean => a.v === b.v;

describe("computeSingleThreeWayMerge", () => {
  it("classifies unchanged when neither side diverged", () => {
    const merge = computeSingleThreeWayMerge({ v: 1 }, { v: 1 }, { v: 1 }, eq);
    expect(merge.change.kind).toBe("unchanged");
    expect(merge.hasConflict).toBe(false);
    expect(merge.merged).toEqual({ v: 1 });
  });

  it("classifies localOnly when only local diverged", () => {
    const merge = computeSingleThreeWayMerge({ v: 1 }, { v: 2 }, { v: 1 }, eq);
    expect(merge.change.kind).toBe("localOnly");
    expect(merge.merged).toEqual({ v: 2 });
  });

  it("classifies remoteOnly when only remote diverged", () => {
    const merge = computeSingleThreeWayMerge({ v: 1 }, { v: 1 }, { v: 3 }, eq);
    expect(merge.change.kind).toBe("remoteOnly");
    expect(merge.merged).toEqual({ v: 3 });
  });

  it("classifies bothSame when both diverged to the same value", () => {
    const merge = computeSingleThreeWayMerge({ v: 1 }, { v: 5 }, { v: 5 }, eq);
    expect(merge.change.kind).toBe("bothSame");
    expect(merge.hasConflict).toBe(false);
    expect(merge.merged).toEqual({ v: 5 });
  });

  it("classifies conflict when both diverged to different values", () => {
    const merge = computeSingleThreeWayMerge({ v: 1 }, { v: 2 }, { v: 3 }, eq);
    expect(merge.change.kind).toBe("conflict");
    expect(merge.hasConflict).toBe(true);
    expect(merge.merged).toBeUndefined();
  });
});

describe("resolveSingleMerge", () => {
  const code = "X_UNRESOLVED" as never;

  it("returns the auto-merged value for non-conflicts", () => {
    const merge = computeSingleThreeWayMerge({ v: 1 }, { v: 2 }, { v: 1 }, eq);
    expect(resolveSingleMerge(merge, undefined, code)).toEqual({ v: 2 });
  });

  it("returns the chosen side for a conflict", () => {
    const merge = computeSingleThreeWayMerge({ v: 1 }, { v: 2 }, { v: 3 }, eq);
    expect(resolveSingleMerge(merge, "local", code)).toEqual({ v: 2 });
    expect(resolveSingleMerge(merge, "remote", code)).toEqual({ v: 3 });
  });

  it("throws when a conflict is left unresolved", () => {
    const merge = computeSingleThreeWayMerge({ v: 1 }, { v: 2 }, { v: 3 }, eq);
    expect(() => resolveSingleMerge(merge, undefined, code)).toThrow(
      BusinessRuleError,
    );
  });
});
