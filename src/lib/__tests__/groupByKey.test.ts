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
});
