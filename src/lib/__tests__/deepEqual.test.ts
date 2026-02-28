import { describe, expect, it } from "vitest";
import { deepEqual } from "../deepEqual";

describe("deepEqual", () => {
  it("should return true for identical primitives", () => {
    expect(deepEqual(1, 1)).toBe(true);
    expect(deepEqual("a", "a")).toBe(true);
    expect(deepEqual(true, true)).toBe(true);
    expect(deepEqual(null, null)).toBe(true);
    expect(deepEqual(undefined, undefined)).toBe(true);
  });

  it("should return false for different primitives", () => {
    expect(deepEqual(1, 2)).toBe(false);
    expect(deepEqual("a", "b")).toBe(false);
    expect(deepEqual(true, false)).toBe(false);
    expect(deepEqual(null, undefined)).toBe(false);
    expect(deepEqual(0, "0")).toBe(false);
  });

  it("should compare flat objects", () => {
    expect(deepEqual({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true);
    expect(deepEqual({ a: 1, b: 2 }, { a: 1, b: 3 })).toBe(false);
    expect(deepEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
  });

  it("should compare objects regardless of key order", () => {
    expect(deepEqual({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(true);
  });

  it("should compare nested objects", () => {
    expect(deepEqual({ a: { b: { c: 1 } } }, { a: { b: { c: 1 } } })).toBe(
      true,
    );
    expect(deepEqual({ a: { b: { c: 1 } } }, { a: { b: { c: 2 } } })).toBe(
      false,
    );
  });

  it("should compare arrays", () => {
    expect(deepEqual([1, 2, 3], [1, 2, 3])).toBe(true);
    expect(deepEqual([1, 2, 3], [1, 3, 2])).toBe(false);
    expect(deepEqual([1, 2], [1, 2, 3])).toBe(false);
  });

  it("should compare arrays of objects", () => {
    expect(deepEqual([{ a: 1 }], [{ a: 1 }])).toBe(true);
    expect(deepEqual([{ a: 1 }], [{ a: 2 }])).toBe(false);
  });

  it("should handle null vs object", () => {
    expect(deepEqual(null, {})).toBe(false);
    expect(deepEqual({}, null)).toBe(false);
  });

  it("should handle arrays vs objects", () => {
    expect(deepEqual([], {})).toBe(false);
    expect(deepEqual({}, [])).toBe(false);
  });

  it("should handle empty structures", () => {
    expect(deepEqual({}, {})).toBe(true);
    expect(deepEqual([], [])).toBe(true);
  });
});
