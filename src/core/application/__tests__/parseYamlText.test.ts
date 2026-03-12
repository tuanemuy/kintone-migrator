import { describe, expect, it } from "vitest";
import { configCodec } from "@/core/adapters/yaml/configCodec";
import { isValidationError } from "../error";
import { parseYamlText } from "../parseYamlText";

describe("parseYamlText", () => {
  it("正常なYAMLテキストをパースする", () => {
    const result = parseYamlText(configCodec, "key: value\nnum: 42", "Test");
    expect(result).toEqual({ key: "value", num: 42 });
  });

  it("空テキストの場合、ValidationErrorをスローする", () => {
    expect(() => parseYamlText(configCodec, "", "Test")).toThrow(
      "Test config text is empty",
    );
    try {
      parseYamlText(configCodec, "   ", "Test");
      expect.fail("Expected error");
    } catch (error) {
      expect(isValidationError(error)).toBe(true);
    }
  });

  it("不正なYAMLの場合、ValidationErrorをスローする", () => {
    try {
      parseYamlText(configCodec, "{ invalid yaml:", "Test");
      expect.fail("Expected error");
    } catch (error) {
      expect(isValidationError(error)).toBe(true);
      if (isValidationError(error)) {
        expect(error.message).toContain("Failed to parse Test YAML");
      }
    }
  });
});
