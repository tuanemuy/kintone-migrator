import { describe, expect, it, vi } from "vitest";
import { ProcessManagementConfigParser } from "@/core/domain/processManagement/services/configParser";
import { isValidationError } from "../../error";
import { parseProcessManagementConfigText } from "../parseConfig";

describe("parseProcessManagementConfigText", () => {
  it("有効なプロセス管理設定をパースする", () => {
    const rawText = `
enable: true
states:
  未処理:
    index: 0
    assignee:
      type: ONE
      entities:
        - type: USER
          code: user1
actions: []
`;
    const config = parseProcessManagementConfigText(rawText);
    expect(config.enable).toBe(true);
    expect(Object.keys(config.states)).toHaveLength(1);
    expect(config.states.未処理.assignee.type).toBe("ONE");
  });

  it("BusinessRuleError を ValidationError に変換する", () => {
    try {
      parseProcessManagementConfigText("");
      expect.fail("Expected ValidationError to be thrown");
    } catch (error) {
      expect(isValidationError(error)).toBe(true);
    }
  });

  it("不正なYAMLの場合に ValidationError をスローする", () => {
    try {
      parseProcessManagementConfigText("{ invalid yaml:");
      expect.fail("Expected ValidationError to be thrown");
    } catch (error) {
      expect(isValidationError(error)).toBe(true);
    }
  });

  it("不正な構造のYAMLの場合に ValidationError をスローする", () => {
    try {
      parseProcessManagementConfigText("states:\n  - invalid_array");
      expect.fail("Expected error to be thrown");
    } catch (error) {
      expect(isValidationError(error)).toBe(true);
    }
  });

  it("BusinessRuleError以外のエラーはそのまま再スローされる", () => {
    vi.spyOn(ProcessManagementConfigParser, "parse").mockImplementation(() => {
      throw new TypeError("unexpected error");
    });
    expect(() => parseProcessManagementConfigText("dummy")).toThrow(TypeError);
    vi.restoreAllMocks();
  });
});
