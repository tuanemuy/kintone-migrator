import { describe, expect, it } from "vitest";
import { BusinessRuleError } from "@/core/domain/error";
import { AdminNotesErrorCode } from "../../errorCode";
import { AdminNotesConfigParser } from "../configParser";

describe("AdminNotesConfigParser", () => {
  describe("parse", () => {
    it("should parse a valid config", () => {
      const config = AdminNotesConfigParser.parse({
        content: "<p>このアプリはkintone-migratorで管理されています。</p>\n",
        includeInTemplateAndDuplicates: true,
      });

      expect(config.content).toContain("kintone-migrator");
      expect(config.includeInTemplateAndDuplicates).toBe(true);
    });

    it("should parse config with includeInTemplateAndDuplicates false", () => {
      const config = AdminNotesConfigParser.parse({
        content: "simple memo",
        includeInTemplateAndDuplicates: false,
      });

      expect(config.content).toBe("simple memo");
      expect(config.includeInTemplateAndDuplicates).toBe(false);
    });

    it("should parse config with multiline HTML content", () => {
      const config = AdminNotesConfigParser.parse({
        content: "<p>Line 1</p>\n<p>Line 2</p>\n",
        includeInTemplateAndDuplicates: true,
      });

      expect(config.content).toContain("<p>Line 1</p>");
      expect(config.content).toContain("<p>Line 2</p>");
    });

    it("should throw AnInvalidConfigStructure for non-object input", () => {
      expect(() => AdminNotesConfigParser.parse("just a string")).toThrow(
        BusinessRuleError,
      );
      expect(() => AdminNotesConfigParser.parse("just a string")).toThrow(
        expect.objectContaining({
          code: AdminNotesErrorCode.AnInvalidConfigStructure,
        }),
      );
    });

    it("should throw AnInvalidConfigStructure for array input", () => {
      expect(() => AdminNotesConfigParser.parse(["item1"])).toThrow(
        BusinessRuleError,
      );
      expect(() => AdminNotesConfigParser.parse(["item1"])).toThrow(
        expect.objectContaining({
          code: AdminNotesErrorCode.AnInvalidConfigStructure,
        }),
      );
    });

    it("should throw AnInvalidConfigStructure for null input", () => {
      expect(() => AdminNotesConfigParser.parse(null)).toThrow(
        BusinessRuleError,
      );
      expect(() => AdminNotesConfigParser.parse(null)).toThrow(
        expect.objectContaining({
          code: AdminNotesErrorCode.AnInvalidConfigStructure,
        }),
      );
    });

    it("should throw AnInvalidConfigStructure when content is missing", () => {
      expect(() =>
        AdminNotesConfigParser.parse({
          includeInTemplateAndDuplicates: true,
        }),
      ).toThrow(BusinessRuleError);
      expect(() =>
        AdminNotesConfigParser.parse({
          includeInTemplateAndDuplicates: true,
        }),
      ).toThrow(
        expect.objectContaining({
          code: AdminNotesErrorCode.AnInvalidConfigStructure,
        }),
      );
    });

    it("should throw AnInvalidConfigStructure when includeInTemplateAndDuplicates is missing", () => {
      expect(() =>
        AdminNotesConfigParser.parse({
          content: "some content",
        }),
      ).toThrow(BusinessRuleError);
      expect(() =>
        AdminNotesConfigParser.parse({
          content: "some content",
        }),
      ).toThrow(
        expect.objectContaining({
          code: AdminNotesErrorCode.AnInvalidConfigStructure,
        }),
      );
    });

    it("should throw AnInvalidConfigStructure when content is not a string", () => {
      expect(() =>
        AdminNotesConfigParser.parse({
          content: 123,
          includeInTemplateAndDuplicates: true,
        }),
      ).toThrow(BusinessRuleError);
      expect(() =>
        AdminNotesConfigParser.parse({
          content: 123,
          includeInTemplateAndDuplicates: true,
        }),
      ).toThrow(
        expect.objectContaining({
          code: AdminNotesErrorCode.AnInvalidConfigStructure,
        }),
      );
    });

    it("should throw AnInvalidConfigStructure when includeInTemplateAndDuplicates is not boolean", () => {
      expect(() =>
        AdminNotesConfigParser.parse({
          content: "some content",
          includeInTemplateAndDuplicates: "yes",
        }),
      ).toThrow(BusinessRuleError);
      expect(() =>
        AdminNotesConfigParser.parse({
          content: "some content",
          includeInTemplateAndDuplicates: "yes",
        }),
      ).toThrow(
        expect.objectContaining({
          code: AdminNotesErrorCode.AnInvalidConfigStructure,
        }),
      );
    });
  });
});
