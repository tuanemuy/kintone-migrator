import { describe, expect, it } from "vitest";
import { formatValue } from "../formatValue";

describe("formatValue", () => {
  it("should return '(none)' for undefined", () => {
    expect(formatValue(undefined)).toBe("(none)");
  });

  it("should return JSON string for a string value", () => {
    expect(formatValue("hello")).toBe('"hello"');
  });

  it("should return JSON string for a number value", () => {
    expect(formatValue(42)).toBe("42");
  });

  it("should return JSON string for a boolean value", () => {
    expect(formatValue(true)).toBe("true");
    expect(formatValue(false)).toBe("false");
  });

  it("should return JSON string for null", () => {
    expect(formatValue(null)).toBe("null");
  });

  it("should return JSON string for an object", () => {
    expect(formatValue({ a: 1, b: "two" })).toBe(
      '{\n  "a": 1,\n  "b": "two"\n}',
    );
  });

  it("should return JSON string for an array", () => {
    expect(formatValue([1, 2, 3])).toBe("[\n  1,\n  2,\n  3\n]");
  });

  it("should return JSON string for an empty object", () => {
    expect(formatValue({})).toBe("{}");
  });

  it("should return JSON string for an empty array", () => {
    expect(formatValue([])).toBe("[]");
  });

  it("should return indented JSON string for a nested object", () => {
    const nested = {
      option1: { label: "選択肢1", index: 0 },
      option2: { label: "選択肢2", index: 1 },
    };
    expect(formatValue(nested)).toBe(JSON.stringify(nested, null, 2));
  });
});
