import { describe, expect, it } from "vitest";
import { ActionErrorCode } from "@/core/domain/action/errorCode";
import { BusinessRuleError } from "@/core/domain/error";
import { parseYamlConfig } from "../yamlConfigParser";

const errorCodes = {
  emptyConfigText: ActionErrorCode.AcEmptyConfigText,
  invalidConfigYaml: ActionErrorCode.AcInvalidConfigYaml,
  invalidConfigStructure: ActionErrorCode.AcInvalidConfigStructure,
};

describe("parseYamlConfig", () => {
  it("should throw on empty string", () => {
    expect(() => parseYamlConfig("", errorCodes, "Test")).toThrow(
      BusinessRuleError,
    );
    expect(() => parseYamlConfig("", errorCodes, "Test")).toThrow(
      "Test config text is empty",
    );
  });

  it("should throw on whitespace-only string", () => {
    expect(() => parseYamlConfig("   \n  ", errorCodes, "Test")).toThrow(
      BusinessRuleError,
    );
    expect(() => parseYamlConfig("   \n  ", errorCodes, "Test")).toThrow(
      "Test config text is empty",
    );
  });

  it("should throw on invalid YAML syntax", () => {
    expect(() => parseYamlConfig("key: [unclosed", errorCodes, "Test")).toThrow(
      BusinessRuleError,
    );
    expect(() => parseYamlConfig("key: [unclosed", errorCodes, "Test")).toThrow(
      "Failed to parse Test YAML:",
    );
  });

  it("should throw on non-object YAML (e.g. scalar)", () => {
    expect(() => parseYamlConfig("just a string", errorCodes, "Test")).toThrow(
      BusinessRuleError,
    );
    expect(() => parseYamlConfig("just a string", errorCodes, "Test")).toThrow(
      "Test config must be a YAML object",
    );
  });

  it("should throw on non-object YAML (e.g. array)", () => {
    expect(() =>
      parseYamlConfig("- item1\n- item2", errorCodes, "Test"),
    ).toThrow("Test config must be a YAML object");
  });

  it("should parse valid YAML object", () => {
    const result = parseYamlConfig("key: value\nnum: 42", errorCodes, "Test");
    expect(result).toEqual({ key: "value", num: 42 });
  });

  it("should throw on YAML null document", () => {
    expect(() => parseYamlConfig("null", errorCodes, "Test")).toThrow(
      "Test config must be a YAML object",
    );
    expect(() => parseYamlConfig("~", errorCodes, "Test")).toThrow(
      "Test config must be a YAML object",
    );
  });

  it("should throw with correct error code", () => {
    expect(() => parseYamlConfig("", errorCodes, "Test")).toThrow(
      expect.objectContaining({
        code: ActionErrorCode.AcEmptyConfigText,
      }),
    );
    expect(() => parseYamlConfig("key: [unclosed", errorCodes, "Test")).toThrow(
      expect.objectContaining({
        code: ActionErrorCode.AcInvalidConfigYaml,
      }),
    );
    expect(() => parseYamlConfig("just a string", errorCodes, "Test")).toThrow(
      expect.objectContaining({
        code: ActionErrorCode.AcInvalidConfigStructure,
      }),
    );
  });

  it("should preserve cause on YAML parse errors", () => {
    try {
      parseYamlConfig("key: [unclosed", errorCodes, "Test");
      expect.fail("Expected error to be thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(BusinessRuleError);
      expect((error as BusinessRuleError).cause).toBeDefined();
    }
  });

  it("should include domainLabel in error messages", () => {
    expect(() => parseYamlConfig("", errorCodes, "Report")).toThrow(
      "Report config text is empty",
    );
    expect(() =>
      parseYamlConfig("key: [unclosed", errorCodes, "Report"),
    ).toThrow("Failed to parse Report YAML:");
    expect(() =>
      parseYamlConfig("just a string", errorCodes, "Notification"),
    ).toThrow("Notification config must be a YAML object");
  });
});
