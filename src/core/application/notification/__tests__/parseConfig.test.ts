import { describe, expect, it, vi } from "vitest";
import { configCodec } from "@/core/adapters/yaml/configCodec";
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
    const config = parseNotificationConfigText(configCodec, rawText);
    expect(config.general).toBeDefined();
    expect(config.general?.notifications).toHaveLength(1);
  });

  it("BusinessRuleErrorをValidationErrorに変換する", () => {
    try {
      parseNotificationConfigText(configCodec, "");
      expect.fail("Expected ValidationError to be thrown");
    } catch (error) {
      expect(isValidationError(error)).toBe(true);
    }
  });

  it("不正なYAMLの場合にValidationErrorをスローする", () => {
    try {
      parseNotificationConfigText(configCodec, "{ invalid yaml:");
      expect.fail("Expected ValidationError to be thrown");
    } catch (error) {
      expect(isValidationError(error)).toBe(true);
    }
  });

  it("不正な構造のYAMLの場合にValidationErrorをスローする", () => {
    try {
      parseNotificationConfigText(configCodec, "general: not_an_object");
      expect.fail("Expected error to be thrown");
    } catch (error) {
      expect(isValidationError(error)).toBe(true);
    }
  });

  it("BusinessRuleError以外のエラーはそのまま再スローされる", () => {
    vi.spyOn(NotificationConfigParser, "parse").mockImplementation(() => {
      throw new TypeError("unexpected error");
    });
    expect(() => parseNotificationConfigText(configCodec, "dummy")).toThrow(
      TypeError,
    );
    vi.restoreAllMocks();
  });
});
