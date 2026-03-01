import { describe, expect, it } from "vitest";
import { groupByKey } from "../groupByKey";

describe("groupByKey", () => {
  it("should group items by key", () => {
    const items = [
      { name: "a", group: "x" },
      { name: "b", group: "y" },
      { name: "c", group: "x" },
    ];
    const result = groupByKey(items, (i) => i.group);
    expect(result.get("x")).toEqual([
      { name: "a", group: "x" },
      { name: "c", group: "x" },
    ]);
    expect(result.get("y")).toEqual([{ name: "b", group: "y" }]);
  });

  it("should return empty map for empty input", () => {
    const result = groupByKey([], (i: string) => i);
    expect(result.size).toBe(0);
  });

  it("should preserve insertion order within groups", () => {
    const items = ["b1", "a1", "b2", "a2"];
    const result = groupByKey(items, (i) => i[0]);
    expect(result.get("b")).toEqual(["b1", "b2"]);
    expect(result.get("a")).toEqual(["a1", "a2"]);
  });

  it("should handle empty string key", () => {
    const result = groupByKey([{ k: "", v: 1 }], (x) => x.k);
    expect(result.get("")).toEqual([{ k: "", v: 1 }]);
    expect(result.size).toBe(1);
  });

  it("should handle numeric-like keys", () => {
    const items = [
      { id: "0", val: "a" },
      { id: "0", val: "b" },
      { id: "1", val: "c" },
    ];
    const result = groupByKey(items, (x) => x.id);
    expect(result.get("0")).toEqual([
      { id: "0", val: "a" },
      { id: "0", val: "b" },
    ]);
    expect(result.get("1")).toEqual([{ id: "1", val: "c" }]);
  });

  it("should group multiple items with different values under the same key", () => {
    const items = [
      { category: "fruit", name: "apple" },
      { category: "fruit", name: "banana" },
      { category: "fruit", name: "cherry" },
    ];
    const result = groupByKey(items, (x) => x.category);
    expect(result.get("fruit")).toEqual([
      { category: "fruit", name: "apple" },
      { category: "fruit", name: "banana" },
      { category: "fruit", name: "cherry" },
    ]);
    expect(result.size).toBe(1);
  });

  it("should handle single item input", () => {
    const result = groupByKey([{ k: "only", v: 42 }], (x) => x.k);
    expect(result.get("only")).toEqual([{ k: "only", v: 42 }]);
    expect(result.size).toBe(1);
  });
});
