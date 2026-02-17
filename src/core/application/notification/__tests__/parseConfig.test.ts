import { describe, expect, it, vi } from "vitest";
import { NotificationConfigParser } from "@/core/domain/notification/services/configParser";
import { isValidationError } from "../../error";
import { parseNotificationConfigText } from "../parseConfig";

describe("parseNotificationConfigText", () => {
  it("有効な通知設定をパースする", () => {
    const rawText = `
general:
  notifyToCommenter: true
  notifications:
    - entity:
        type: USER
        code: admin
      recordAdded: true
      recordEdited: false
      commentAdded: false
      statusChanged: false
      fileImported: false
`;
    const config = parseNotificationConfigText(rawText);
    expect(config.general).toBeDefined();
    expect(config.general?.notifications).toHaveLength(1);
  });

  it("BusinessRuleErrorをValidationErrorに変換する", () => {
    try {
      parseNotificationConfigText("");
      expect.fail("Expected ValidationError to be thrown");
    } catch (error) {
      expect(isValidationError(error)).toBe(true);
    }
  });

  it("不正なYAMLの場合にValidationErrorをスローする", () => {
    try {
      parseNotificationConfigText("{ invalid yaml:");
      expect.fail("Expected ValidationError to be thrown");
    } catch (error) {
      expect(isValidationError(error)).toBe(true);
    }
  });

  it("不正な構造のYAMLの場合にValidationErrorをスローする", () => {
    try {
      parseNotificationConfigText("general: not_an_object");
      expect.fail("Expected error to be thrown");
    } catch (error) {
      expect(isValidationError(error)).toBe(true);
    }
  });

  it("BusinessRuleError以外のエラーはそのまま再スローされる", () => {
    vi.spyOn(NotificationConfigParser, "parse").mockImplementation(() => {
      throw new TypeError("unexpected error");
    });
    expect(() => parseNotificationConfigText("dummy")).toThrow(TypeError);
    vi.restoreAllMocks();
  });
});
