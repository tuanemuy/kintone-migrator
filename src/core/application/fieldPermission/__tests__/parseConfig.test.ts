import { describe, expect, it } from "vitest";
import { isValidationError } from "../../error";
import { parseFieldPermissionConfigText } from "../parseConfig";

describe("parseFieldPermissionConfigText", () => {
  it("有効なフィールド権限設定をパースする", () => {
    const rawText = `
rights:
  - code: name
    entities:
      - accessibility: WRITE
        entity:
          type: USER
          code: user1
`;
    const config = parseFieldPermissionConfigText(rawText);
    expect(config.rights).toHaveLength(1);
    expect(config.rights[0].code).toBe("name");
  });

  it("BusinessRuleErrorをValidationErrorに変換する", () => {
    try {
      parseFieldPermissionConfigText("");
      expect.fail("Expected ValidationError to be thrown");
    } catch (error) {
      expect(isValidationError(error)).toBe(true);
    }
  });

  it("不正なYAMLの場合にValidationErrorをスローする", () => {
    try {
      parseFieldPermissionConfigText("{ invalid yaml:");
      expect.fail("Expected ValidationError to be thrown");
    } catch (error) {
      expect(isValidationError(error)).toBe(true);
    }
  });

  it("不正な構造のYAMLの場合にValidationErrorをスローする", () => {
    try {
      parseFieldPermissionConfigText("rights: not_array");
      expect.fail("Expected error to be thrown");
    } catch (error) {
      expect(isValidationError(error)).toBe(true);
    }
  });
});
