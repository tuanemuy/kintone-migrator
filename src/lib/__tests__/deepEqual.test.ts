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

  it("should distinguish { a: undefined } from {}", () => {
    expect(deepEqual({ a: undefined }, {})).toBe(false);
    expect(deepEqual({}, { a: undefined })).toBe(false);
  });

  it("should handle nested undefined values", () => {
    expect(deepEqual({ a: { b: undefined } }, { a: { b: undefined } })).toBe(
      true,
    );
    expect(deepEqual({ a: { b: undefined } }, { a: {} })).toBe(false);
  });

  it("should compare Date objects by value", () => {
    const d1 = new Date("2024-01-01");
    const d2 = new Date("2024-01-01");
    const d3 = new Date("2024-06-15");
    expect(deepEqual(d1, d2)).toBe(true);
    expect(deepEqual(d1, d3)).toBe(false);
  });

  it("should return false for Date vs non-Date", () => {
    expect(deepEqual(new Date("2024-01-01"), {})).toBe(false);
    expect(deepEqual({}, new Date("2024-01-01"))).toBe(false);
    expect(deepEqual(new Date("2024-01-01"), "2024-01-01")).toBe(false);
  });

  it("should compare RegExp objects by value", () => {
    expect(deepEqual(/abc/g, /abc/g)).toBe(true);
    expect(deepEqual(/abc/g, /abc/i)).toBe(false);
    expect(deepEqual(/abc/, /def/)).toBe(false);
  });

  it("should return false for RegExp vs non-RegExp", () => {
    expect(deepEqual(/abc/, {})).toBe(false);
    expect(deepEqual({}, /abc/)).toBe(false);
    expect(deepEqual(/abc/, "abc")).toBe(false);
  });

  it("should compare Map objects", () => {
    const m1 = new Map([
      ["a", 1],
      ["b", 2],
    ]);
    const m2 = new Map([
      ["a", 1],
      ["b", 2],
    ]);
    const m3 = new Map([
      ["a", 1],
      ["b", 3],
    ]);
    const m4 = new Map([["a", 1]]);
    expect(deepEqual(m1, m2)).toBe(true);
    expect(deepEqual(m1, m3)).toBe(false);
    expect(deepEqual(m1, m4)).toBe(false);
  });

  it("should compare nested Maps", () => {
    const m1 = new Map([["a", { x: 1 }]]);
    const m2 = new Map([["a", { x: 1 }]]);
    const m3 = new Map([["a", { x: 2 }]]);
    expect(deepEqual(m1, m2)).toBe(true);
    expect(deepEqual(m1, m3)).toBe(false);
  });

  it("should return false for Map vs non-Map", () => {
    expect(deepEqual(new Map(), {})).toBe(false);
    expect(deepEqual({}, new Map())).toBe(false);
  });

  it("should compare Set objects", () => {
    const s1 = new Set([1, 2, 3]);
    const s2 = new Set([1, 2, 3]);
    const s3 = new Set([1, 2, 4]);
    const s4 = new Set([1, 2]);
    expect(deepEqual(s1, s2)).toBe(true);
    expect(deepEqual(s1, s3)).toBe(false);
    expect(deepEqual(s1, s4)).toBe(false);
  });

  it("should deep-compare Set elements (not reference equality)", () => {
    const s1 = new Set([{ a: 1 }, { b: 2 }]);
    const s2 = new Set([{ a: 1 }, { b: 2 }]);
    const s3 = new Set([{ a: 1 }, { b: 3 }]);
    expect(deepEqual(s1, s2)).toBe(true);
    expect(deepEqual(s1, s3)).toBe(false);
  });

  it("should return false for Set vs non-Set", () => {
    expect(deepEqual(new Set(), {})).toBe(false);
    expect(deepEqual({}, new Set())).toBe(false);
  });

  it("should compare Sets with different element orders", () => {
    const s1 = new Set([1, 2, 3]);
    const s2 = new Set([3, 1, 2]);
    expect(deepEqual(s1, s2)).toBe(true);
  });

  it("should deep-compare Set elements regardless of insertion order", () => {
    const s1 = new Set([{ a: 1 }, { b: 2 }]);
    const s2 = new Set([{ b: 2 }, { a: 1 }]);
    expect(deepEqual(s1, s2)).toBe(true);
  });

  it("should return false for circular references (documented limitation: conservative false negative)", () => {
    const a: Record<string, unknown> = { x: 1 };
    a.self = a;
    const b: Record<string, unknown> = { x: 1 };
    b.self = b;
    expect(deepEqual(a, b)).toBe(false);
  });

  it("should return false when only the second argument has a circular reference (documented limitation)", () => {
    const a = { x: 1, self: { y: 2 } };
    const b: Record<string, unknown> = { x: 1 };
    b.self = b;
    expect(deepEqual(a, b)).toBe(false);
  });

  it("should handle undefined vs empty object", () => {
    expect(deepEqual(undefined, {})).toBe(false);
    expect(deepEqual(undefined, [])).toBe(false);
  });

  it("should distinguish null property from undefined property", () => {
    expect(deepEqual({ a: null }, { a: undefined })).toBe(false);
    expect(deepEqual({ a: undefined }, { a: null })).toBe(false);
  });

  it("should return false for NaN comparisons", () => {
    expect(deepEqual(Number.NaN, Number.NaN)).toBe(false);
    expect(deepEqual({ a: Number.NaN }, { a: Number.NaN })).toBe(false);
  });
});
