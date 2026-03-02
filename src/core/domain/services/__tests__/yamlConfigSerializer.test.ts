import { describe, expect, it } from "vitest";
import { serializeToYaml } from "../yamlConfigSerializer";

describe("serializeToYaml", () => {
  it("should serialize an object to YAML string", () => {
    const result = serializeToYaml({ key: "value", num: 42 });
    expect(result).toContain("key: value");
    expect(result).toContain("num: 42");
  });

  it("should serialize nested objects", () => {
    const result = serializeToYaml({ parent: { child: "nested" } });
    expect(result).toContain("parent:");
    expect(result).toContain("child: nested");
  });

  it("should serialize arrays", () => {
    const result = serializeToYaml({ items: ["a", "b", "c"] });
    expect(result).toContain("items:");
    expect(result).toContain("- a");
    expect(result).toContain("- b");
    expect(result).toContain("- c");
  });

  it("should serialize empty object", () => {
    const result = serializeToYaml({});
    expect(result.trim()).toBe("{}");
  });
});
