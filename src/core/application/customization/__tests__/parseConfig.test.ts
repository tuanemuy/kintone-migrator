import { describe, expect, it, vi } from "vitest";
import { configCodec } from "@/core/adapters/yaml/configCodec";
import { CustomizationConfigParser } from "@/core/domain/customization/services/configParser";
import { isValidationError } from "../../error";
import { parseConfigText } from "../parseConfig";

describe("parseConfigText", () => {
  it("有効なカスタマイズ設定をパースする", () => {
    const rawText = `
scope: ALL
desktop:
  js:
    - type: FILE
      path: ./dist/main.js
  css: []
`;
    const config = parseConfigText(configCodec, rawText);
    expect(config.scope).toBe("ALL");
    expect(config.desktop.js).toHaveLength(1);
  });

  it("BusinessRuleErrorをValidationErrorに変換する", () => {
    try {
      parseConfigText(configCodec, "");
      expect.fail("Expected ValidationError to be thrown");
    } catch (error) {
      expect(isValidationError(error)).toBe(true);
    }
  });

  it("不正なYAMLの場合にValidationErrorをスローする", () => {
    try {
      parseConfigText(configCodec, "{ invalid yaml:");
      expect.fail("Expected ValidationError to be thrown");
    } catch (error) {
      expect(isValidationError(error)).toBe(true);
    }
  });

  it("BusinessRuleError以外のエラーはそのまま再スローされる", () => {
    vi.spyOn(CustomizationConfigParser, "parse").mockImplementation(() => {
      throw new TypeError("unexpected error");
    });
    expect(() => parseConfigText(configCodec, "dummy")).toThrow(TypeError);
    vi.restoreAllMocks();
  });
});
