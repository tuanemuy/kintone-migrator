import { describe, expect, it, vi } from "vitest";
import { configCodec } from "@/core/adapters/yaml/configCodec";
import { ActionConfigParser } from "@/core/domain/action/services/configParser";
import { isValidationError } from "../../error";
import { parseActionConfigText } from "../parseConfig";

describe("parseActionConfigText", () => {
  it("有効なアクション設定をパースする", () => {
    const rawText = `
actions:
  test:
    index: 0
    destApp:
      code: target-app
    mappings:
      - srcType: FIELD
        srcField: src
        destField: dest
    entities:
      - type: USER
        code: user1
`;
    const config = parseActionConfigText(configCodec, rawText);
    expect(Object.keys(config.actions)).toHaveLength(1);
    expect(config.actions.test.name).toBe("test");
  });

  it("BusinessRuleErrorをValidationErrorに変換する", () => {
    try {
      parseActionConfigText(configCodec, "");
      expect.fail("Expected ValidationError to be thrown");
    } catch (error) {
      expect(isValidationError(error)).toBe(true);
    }
  });

  it("不正なYAMLの場合にValidationErrorをスローする", () => {
    try {
      parseActionConfigText(configCodec, "{ invalid yaml:");
      expect.fail("Expected ValidationError to be thrown");
    } catch (error) {
      expect(isValidationError(error)).toBe(true);
    }
  });

  it("不正な構造のYAMLの場合にValidationErrorをスローする", () => {
    try {
      parseActionConfigText(configCodec, "actions: not_object");
      expect.fail("Expected error to be thrown");
    } catch (error) {
      expect(isValidationError(error)).toBe(true);
    }
  });

  it("BusinessRuleError以外のエラーはそのまま再スローされる", () => {
    vi.spyOn(ActionConfigParser, "parse").mockImplementation(() => {
      throw new TypeError("unexpected error");
    });
    expect(() => parseActionConfigText(configCodec, "dummy")).toThrow(
      TypeError,
    );
    vi.restoreAllMocks();
  });
});
