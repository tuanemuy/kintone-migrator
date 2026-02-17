import { describe, expect, it, vi } from "vitest";
import { ConfigParser } from "@/core/domain/customization/services/configParser";
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
    const config = parseConfigText(rawText);
    expect(config.scope).toBe("ALL");
    expect(config.desktop.js).toHaveLength(1);
  });

  it("BusinessRuleErrorをValidationErrorに変換する", () => {
    try {
      parseConfigText("");
      expect.fail("Expected ValidationError to be thrown");
    } catch (error) {
      expect(isValidationError(error)).toBe(true);
    }
  });

  it("不正なYAMLの場合にValidationErrorをスローする", () => {
    try {
      parseConfigText("{ invalid yaml:");
      expect.fail("Expected ValidationError to be thrown");
    } catch (error) {
      expect(isValidationError(error)).toBe(true);
    }
  });

  it("BusinessRuleError以外のエラーはそのまま再スローされる", () => {
    vi.spyOn(ConfigParser, "parse").mockImplementation(() => {
      throw new TypeError("unexpected error");
    });
    expect(() => parseConfigText("dummy")).toThrow(TypeError);
    vi.restoreAllMocks();
  });
});
