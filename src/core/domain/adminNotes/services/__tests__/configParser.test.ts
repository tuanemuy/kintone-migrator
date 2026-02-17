import { describe, expect, it } from "vitest";
import { BusinessRuleError } from "@/core/domain/error";
import { AdminNotesErrorCode } from "../../errorCode";
import { AdminNotesConfigParser } from "../configParser";

describe("AdminNotesConfigParser", () => {
  describe("parse", () => {
    it("should parse a valid config", () => {
      const yaml = `
content: |
  <p>このアプリはkintone-migratorで管理されています。</p>
includeInTemplateAndDuplicates: true
`;
      const config = AdminNotesConfigParser.parse(yaml);

      expect(config.content).toContain("kintone-migrator");
      expect(config.includeInTemplateAndDuplicates).toBe(true);
    });

    it("should parse config with includeInTemplateAndDuplicates false", () => {
      const yaml = `
content: simple memo
includeInTemplateAndDuplicates: false
`;
      const config = AdminNotesConfigParser.parse(yaml);

      expect(config.content).toBe("simple memo");
      expect(config.includeInTemplateAndDuplicates).toBe(false);
    });

    it("should parse config with multiline HTML content", () => {
      const yaml = `
content: |
  <p>Line 1</p>
  <p>Line 2</p>
includeInTemplateAndDuplicates: true
`;
      const config = AdminNotesConfigParser.parse(yaml);

      expect(config.content).toContain("<p>Line 1</p>");
      expect(config.content).toContain("<p>Line 2</p>");
    });

    it("should throw AnEmptyConfigText for empty text", () => {
      expect(() => AdminNotesConfigParser.parse("")).toThrow(BusinessRuleError);
      expect(() => AdminNotesConfigParser.parse("")).toThrow(
        expect.objectContaining({
          code: AdminNotesErrorCode.AnEmptyConfigText,
        }),
      );
    });

    it("should throw AnEmptyConfigText for whitespace-only text", () => {
      expect(() => AdminNotesConfigParser.parse("   \n  ")).toThrow(
        BusinessRuleError,
      );
      expect(() => AdminNotesConfigParser.parse("   \n  ")).toThrow(
        expect.objectContaining({
          code: AdminNotesErrorCode.AnEmptyConfigText,
        }),
      );
    });

    it("should throw AnInvalidConfigYaml for invalid YAML", () => {
      expect(() => AdminNotesConfigParser.parse("{ invalid: yaml:")).toThrow(
        BusinessRuleError,
      );
      expect(() => AdminNotesConfigParser.parse("{ invalid: yaml:")).toThrow(
        expect.objectContaining({
          code: AdminNotesErrorCode.AnInvalidConfigYaml,
        }),
      );
    });

    it("should throw AnInvalidConfigStructure for non-object YAML", () => {
      expect(() => AdminNotesConfigParser.parse("just a string")).toThrow(
        BusinessRuleError,
      );
      expect(() => AdminNotesConfigParser.parse("just a string")).toThrow(
        expect.objectContaining({
          code: AdminNotesErrorCode.AnInvalidConfigStructure,
        }),
      );
    });

    it("should throw AnInvalidConfigStructure when content is missing", () => {
      const yaml = `
includeInTemplateAndDuplicates: true
`;
      expect(() => AdminNotesConfigParser.parse(yaml)).toThrow(
        BusinessRuleError,
      );
      expect(() => AdminNotesConfigParser.parse(yaml)).toThrow(
        expect.objectContaining({
          code: AdminNotesErrorCode.AnInvalidConfigStructure,
        }),
      );
    });

    it("should throw AnInvalidConfigStructure when includeInTemplateAndDuplicates is missing", () => {
      const yaml = `
content: some content
`;
      expect(() => AdminNotesConfigParser.parse(yaml)).toThrow(
        BusinessRuleError,
      );
      expect(() => AdminNotesConfigParser.parse(yaml)).toThrow(
        expect.objectContaining({
          code: AdminNotesErrorCode.AnInvalidConfigStructure,
        }),
      );
    });

    it("should throw AnInvalidConfigStructure when content is not a string", () => {
      const yaml = `
content: 123
includeInTemplateAndDuplicates: true
`;
      expect(() => AdminNotesConfigParser.parse(yaml)).toThrow(
        BusinessRuleError,
      );
      expect(() => AdminNotesConfigParser.parse(yaml)).toThrow(
        expect.objectContaining({
          code: AdminNotesErrorCode.AnInvalidConfigStructure,
        }),
      );
    });

    it("should throw AnInvalidConfigStructure when includeInTemplateAndDuplicates is not boolean", () => {
      const yaml = `
content: some content
includeInTemplateAndDuplicates: "yes"
`;
      expect(() => AdminNotesConfigParser.parse(yaml)).toThrow(
        BusinessRuleError,
      );
      expect(() => AdminNotesConfigParser.parse(yaml)).toThrow(
        expect.objectContaining({
          code: AdminNotesErrorCode.AnInvalidConfigStructure,
        }),
      );
    });
  });
});
