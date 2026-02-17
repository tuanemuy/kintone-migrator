import { describe, expect, it, vi } from "vitest";
import { AppPermissionConfigParser } from "@/core/domain/appPermission/services/configParser";
import { isValidationError } from "../../error";
import { parseAppPermissionConfigText } from "../parseConfig";

describe("parseAppPermissionConfigText", () => {
  it("should parse valid app permission config", () => {
    const rawText = `
rights:
  - entity:
      type: GROUP
      code: Administrators
    includeSubs: false
    appEditable: true
    recordViewable: true
    recordAddable: true
    recordEditable: true
    recordDeletable: true
    recordImportable: true
    recordExportable: true
`;
    const config = parseAppPermissionConfigText(rawText);
    expect(config.rights).toHaveLength(1);
    expect(config.rights[0].entity.code).toBe("Administrators");
  });

  it("should convert BusinessRuleError to ValidationError", () => {
    try {
      parseAppPermissionConfigText("");
      expect.fail("Expected ValidationError to be thrown");
    } catch (error) {
      expect(isValidationError(error)).toBe(true);
    }
  });

  it("should throw ValidationError for invalid YAML", () => {
    try {
      parseAppPermissionConfigText("{ invalid yaml:");
      expect.fail("Expected ValidationError to be thrown");
    } catch (error) {
      expect(isValidationError(error)).toBe(true);
    }
  });

  it("should throw ValidationError for invalid structure", () => {
    try {
      parseAppPermissionConfigText("rights: not_array");
      expect.fail("Expected error to be thrown");
    } catch (error) {
      expect(isValidationError(error)).toBe(true);
    }
  });

  it("should re-throw non-BusinessRuleError as-is", () => {
    vi.spyOn(AppPermissionConfigParser, "parse").mockImplementation(() => {
      throw new TypeError("unexpected error");
    });
    expect(() => parseAppPermissionConfigText("dummy")).toThrow(TypeError);
    vi.restoreAllMocks();
  });
});
