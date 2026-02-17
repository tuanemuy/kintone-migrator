import { describe, expect, it, vi } from "vitest";
import { isValidationError } from "@/core/application/error";
import { ViewConfigParser } from "@/core/domain/view/services/configParser";
import { parseViewConfigText } from "../parseConfig";

describe("parseViewConfigText", () => {
  it("should parse valid config text", () => {
    const result = parseViewConfigText(`
views:
  test:
    type: LIST
    index: 0
`);

    expect(result.views.test.type).toBe("LIST");
  });

  it("should convert BusinessRuleError to ValidationError for empty text", () => {
    expect.assertions(1);
    try {
      parseViewConfigText("");
    } catch (error) {
      expect(isValidationError(error)).toBe(true);
    }
  });

  it("should convert BusinessRuleError to ValidationError for invalid YAML", () => {
    expect.assertions(1);
    try {
      parseViewConfigText("{ invalid: yaml:");
    } catch (error) {
      expect(isValidationError(error)).toBe(true);
    }
  });

  it("should convert BusinessRuleError to ValidationError for invalid structure", () => {
    expect.assertions(1);
    try {
      parseViewConfigText("not_views: value");
    } catch (error) {
      expect(isValidationError(error)).toBe(true);
    }
  });

  it("should convert BusinessRuleError to ValidationError for invalid view type", () => {
    expect.assertions(1);
    try {
      parseViewConfigText(`
views:
  test:
    type: INVALID
`);
    } catch (error) {
      expect(isValidationError(error)).toBe(true);
    }
  });

  it("should re-throw non-BusinessRuleError as-is", () => {
    vi.spyOn(ViewConfigParser, "parse").mockImplementation(() => {
      throw new TypeError("unexpected error");
    });
    expect(() => parseViewConfigText("dummy")).toThrow(TypeError);
    vi.restoreAllMocks();
  });
});
