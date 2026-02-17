import { describe, expect, it, vi } from "vitest";
import { RecordPermissionConfigParser } from "@/core/domain/recordPermission/services/configParser";
import { isValidationError } from "../../error";
import { parseRecordPermissionConfigText } from "../parseConfig";

describe("parseRecordPermissionConfigText", () => {
  it("有効なレコード権限設定をパースする", () => {
    const rawText = `
rights:
  - filterCond: ""
    entities:
      - entity:
          type: USER
          code: user1
        viewable: true
        editable: false
        deletable: false
        includeSubs: false
`;
    const config = parseRecordPermissionConfigText(rawText);
    expect(config.rights).toHaveLength(1);
    expect(config.rights[0].entities[0].entity.code).toBe("user1");
  });

  it("BusinessRuleErrorをValidationErrorに変換する", () => {
    try {
      parseRecordPermissionConfigText("");
      expect.fail("Expected ValidationError to be thrown");
    } catch (error) {
      expect(isValidationError(error)).toBe(true);
    }
  });

  it("不正なYAMLの場合にValidationErrorをスローする", () => {
    try {
      parseRecordPermissionConfigText("{ invalid yaml:");
      expect.fail("Expected ValidationError to be thrown");
    } catch (error) {
      expect(isValidationError(error)).toBe(true);
    }
  });

  it("不正な構造のYAMLの場合にValidationErrorをスローする", () => {
    try {
      parseRecordPermissionConfigText("rights: not_array");
      expect.fail("Expected error to be thrown");
    } catch (error) {
      expect(isValidationError(error)).toBe(true);
    }
  });

  it("BusinessRuleError以外のエラーはそのまま再スローされる", () => {
    vi.spyOn(RecordPermissionConfigParser, "parse").mockImplementation(() => {
      throw new TypeError("unexpected error");
    });
    expect(() => parseRecordPermissionConfigText("dummy")).toThrow(TypeError);
    vi.restoreAllMocks();
  });
});
