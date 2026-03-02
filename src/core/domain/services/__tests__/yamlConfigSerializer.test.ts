import { describe, expect, it } from "vitest";
import { serializeToYaml } from "../yamlConfigSerializer";

describe("serializeToYaml", () => {
  it("should serialize an object to YAML string", () => {
    const result = serializeToYaml({ key: "value", num: 42 });
    expect(result).toBe("key: value\nnum: 42\n");
  });

  it("should serialize nested objects", () => {
    const result = serializeToYaml({ parent: { child: "nested" } });
    expect(result).toBe("parent:\n  child: nested\n");
  });

  it("should serialize arrays", () => {
    const result = serializeToYaml({ items: ["a", "b", "c"] });
    expect(result).toBe("items:\n  - a\n  - b\n  - c\n");
  });

  it("should serialize empty object", () => {
    const result = serializeToYaml({});
    expect(result.trim()).toBe("{}");
  });
});
