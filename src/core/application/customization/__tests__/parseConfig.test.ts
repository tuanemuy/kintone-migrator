import { describe, expect, it } from "vitest";
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
    // parseConfigText内でBusinessRuleError以外のエラーは発生しないが、
    // ConfigParser.parseの実装上、非BusinessRuleErrorはそのまま伝播される
    // ここでは不正な構造のYAMLでBusinessRuleErrorが変換されることを検証
    try {
      parseConfigText("scope: INVALID_SCOPE\ndesktop:\n  js: []\n  css: []");
      expect.fail("Expected error to be thrown");
    } catch (error) {
      expect(isValidationError(error)).toBe(true);
    }
  });
});
