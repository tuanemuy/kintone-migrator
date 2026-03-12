import { describe, expect, it } from "vitest";
import type { BusinessRuleErrorCode } from "@/core/domain/error";
import { BusinessRuleError } from "@/core/domain/error";
import { validateParsedConfig } from "../configValidator";

const errorCode = "TEST_INVALID_STRUCTURE" as BusinessRuleErrorCode;

describe("validateParsedConfig", () => {
  it("should throw on non-object input (e.g. scalar string)", () => {
    expect(() =>
      validateParsedConfig("just a string", errorCode, "Test"),
    ).toThrow(BusinessRuleError);
    expect(() =>
      validateParsedConfig("just a string", errorCode, "Test"),
    ).toThrow("Test config must be an object");
  });

  it("should throw on array input", () => {
    expect(() =>
      validateParsedConfig(["item1", "item2"], errorCode, "Test"),
    ).toThrow("Test config must be an object");
  });

  it("should return valid object", () => {
    const result = validateParsedConfig(
      { key: "value", num: 42 },
      errorCode,
      "Test",
    );
    expect(result).toEqual({ key: "value", num: 42 });
  });

  it("should throw on null", () => {
    expect(() => validateParsedConfig(null, errorCode, "Test")).toThrow(
      "Test config must be an object",
    );
  });

  it("should throw on undefined", () => {
    expect(() => validateParsedConfig(undefined, errorCode, "Test")).toThrow(
      "Test config must be an object",
    );
  });

  it("should throw with correct error code", () => {
    expect(() => validateParsedConfig("scalar", errorCode, "Test")).toThrow(
      expect.objectContaining({
        code: errorCode,
      }),
    );
  });

  it("should include domainLabel in error messages", () => {
    expect(() =>
      validateParsedConfig("scalar", errorCode, "Notification"),
    ).toThrow("Notification config must be an object");
  });
});
