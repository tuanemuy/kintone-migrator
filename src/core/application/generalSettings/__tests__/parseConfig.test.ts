import { describe, expect, it, vi } from "vitest";
import { GeneralSettingsConfigParser } from "@/core/domain/generalSettings/services/configParser";
import { isValidationError } from "../../error";
import { parseGeneralSettingsConfigText } from "../parseConfig";

describe("parseGeneralSettingsConfigText", () => {
  it("should parse valid general settings config", () => {
    const rawText = `
name: My App
theme: BLUE
enableThumbnails: true
`;
    const config = parseGeneralSettingsConfigText(rawText);
    expect(config.name).toBe("My App");
    expect(config.theme).toBe("BLUE");
    expect(config.enableThumbnails).toBe(true);
  });

  it("should convert BusinessRuleError to ValidationError", () => {
    try {
      parseGeneralSettingsConfigText("");
      expect.fail("Expected ValidationError to be thrown");
    } catch (error) {
      expect(isValidationError(error)).toBe(true);
    }
  });

  it("should throw ValidationError for invalid YAML", () => {
    try {
      parseGeneralSettingsConfigText("{ invalid yaml:");
      expect.fail("Expected ValidationError to be thrown");
    } catch (error) {
      expect(isValidationError(error)).toBe(true);
    }
  });

  it("should throw ValidationError for invalid structure", () => {
    try {
      parseGeneralSettingsConfigText("theme: INVALID_THEME");
      expect.fail("Expected error to be thrown");
    } catch (error) {
      expect(isValidationError(error)).toBe(true);
    }
  });

  it("should re-throw non-BusinessRuleError as-is", () => {
    vi.spyOn(GeneralSettingsConfigParser, "parse").mockImplementation(() => {
      throw new TypeError("unexpected error");
    });
    expect(() => parseGeneralSettingsConfigText("dummy")).toThrow(TypeError);
    vi.restoreAllMocks();
  });
});
