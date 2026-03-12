import { describe, expect, it } from "vitest";
import { configCodec } from "../configCodec";

describe("configCodec", () => {
  describe("parse", () => {
    it("should parse a YAML string to an object", () => {
      const result = configCodec.parse("key: value\nnum: 42");
      expect(result).toEqual({ key: "value", num: 42 });
    });

    it("should parse nested objects", () => {
      const result = configCodec.parse("parent:\n  child: nested");
      expect(result).toEqual({ parent: { child: "nested" } });
    });

    it("should return null for empty YAML document", () => {
      expect(configCodec.parse("null")).toBeNull();
    });

    it("should throw on invalid YAML syntax", () => {
      expect(() => configCodec.parse("key: [unclosed")).toThrow();
    });

    it("should return null for empty string", () => {
      expect(configCodec.parse("")).toBeNull();
    });

    it("should return a primitive for scalar YAML", () => {
      expect(configCodec.parse("42")).toBe(42);
      expect(configCodec.parse("hello")).toBe("hello");
    });

    it("should throw on multi-document YAML", () => {
      expect(() => configCodec.parse("key: first\n---\nkey: second")).toThrow();
    });
  });

  describe("stringify", () => {
    it("should serialize an object to YAML string", () => {
      const result = configCodec.stringify({ key: "value", num: 42 });
      expect(result).toBe("key: value\nnum: 42\n");
    });

    it("should serialize nested objects", () => {
      const result = configCodec.stringify({ parent: { child: "nested" } });
      expect(result).toBe("parent:\n  child: nested\n");
    });

    it("should serialize arrays", () => {
      const result = configCodec.stringify({ items: ["a", "b", "c"] });
      expect(result).toBe("items:\n  - a\n  - b\n  - c\n");
    });

    it("should serialize empty object", () => {
      const result = configCodec.stringify({});
      expect(result.trim()).toBe("{}");
    });

    it("should not wrap long lines", () => {
      const longValue = "a".repeat(200);
      const result = configCodec.stringify({ key: longValue });
      expect(result).toBe(`key: ${longValue}\n`);
    });

    it("should safely round-trip values with special characters", () => {
      const data = {
        colon: "key: value",
        hash: "# not a comment",
        quote: '"quoted"',
      };
      const yaml = configCodec.stringify(data);
      const parsed = configCodec.parse(yaml);
      expect(parsed).toEqual(data);
    });
  });
});
