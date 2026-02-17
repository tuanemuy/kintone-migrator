import { describe, expect, it, vi } from "vitest";
import { AdminNotesConfigParser } from "@/core/domain/adminNotes/services/configParser";
import { isValidationError } from "../../error";
import { parseAdminNotesConfigText } from "../parseConfig";

describe("parseAdminNotesConfigText", () => {
  it("有効な管理者用メモ設定をパースする", () => {
    const rawText = `
content: |
  <p>Test memo</p>
includeInTemplateAndDuplicates: true
`;
    const config = parseAdminNotesConfigText(rawText);
    expect(config.content).toContain("<p>Test memo</p>");
    expect(config.includeInTemplateAndDuplicates).toBe(true);
  });

  it("BusinessRuleErrorをValidationErrorに変換する", () => {
    try {
      parseAdminNotesConfigText("");
      expect.fail("Expected ValidationError to be thrown");
    } catch (error) {
      expect(isValidationError(error)).toBe(true);
    }
  });

  it("不正なYAMLの場合にValidationErrorをスローする", () => {
    try {
      parseAdminNotesConfigText("{ invalid yaml:");
      expect.fail("Expected ValidationError to be thrown");
    } catch (error) {
      expect(isValidationError(error)).toBe(true);
    }
  });

  it("不正な構造のYAMLの場合にValidationErrorをスローする", () => {
    try {
      parseAdminNotesConfigText("content: 123");
      expect.fail("Expected error to be thrown");
    } catch (error) {
      expect(isValidationError(error)).toBe(true);
    }
  });

  it("BusinessRuleError以外のエラーはそのまま再スローされる", () => {
    vi.spyOn(AdminNotesConfigParser, "parse").mockImplementation(() => {
      throw new TypeError("unexpected error");
    });
    expect(() => parseAdminNotesConfigText("dummy")).toThrow(TypeError);
    vi.restoreAllMocks();
  });
});
