import { describe, expect, it } from "vitest";
import { BusinessRuleError } from "@/core/domain/error";
import { GeneralSettingsErrorCode } from "../../errorCode";
import { GeneralSettingsConfigParser } from "../configParser";

describe("GeneralSettingsConfigParser", () => {
  describe("parse", () => {
    it("should parse a valid config with all properties", () => {
      const yaml = `
name: My App
description: App description
icon:
  type: PRESET
  key: APP72
theme: BLUE
titleField:
  selectionMode: MANUAL
  code: title
enableThumbnails: true
enableBulkDeletion: false
enableComments: true
enableDuplicateRecord: false
enableInlineRecordEditing: true
numberPrecision:
  digits: 12
  decimalPlaces: 4
  roundingMode: HALF_EVEN
firstMonthOfFiscalYear: 4
`;
      const config = GeneralSettingsConfigParser.parse(yaml);

      expect(config.name).toBe("My App");
      expect(config.description).toBe("App description");
      expect(config.icon).toEqual({ type: "PRESET", key: "APP72" });
      expect(config.theme).toBe("BLUE");
      expect(config.titleField).toEqual({
        selectionMode: "MANUAL",
        code: "title",
      });
      expect(config.enableThumbnails).toBe(true);
      expect(config.enableBulkDeletion).toBe(false);
      expect(config.enableComments).toBe(true);
      expect(config.enableDuplicateRecord).toBe(false);
      expect(config.enableInlineRecordEditing).toBe(true);
      expect(config.numberPrecision).toEqual({
        digits: 12,
        decimalPlaces: 4,
        roundingMode: "HALF_EVEN",
      });
      expect(config.firstMonthOfFiscalYear).toBe(4);
    });

    it("should parse partial config (undefined properties are not included)", () => {
      const yaml = `
name: My App
theme: RED
`;
      const config = GeneralSettingsConfigParser.parse(yaml);

      expect(config.name).toBe("My App");
      expect(config.theme).toBe("RED");
      expect(config.description).toBeUndefined();
      expect(config.icon).toBeUndefined();
      expect(config.titleField).toBeUndefined();
      expect(config.enableThumbnails).toBeUndefined();
      expect(config.numberPrecision).toBeUndefined();
      expect(config.firstMonthOfFiscalYear).toBeUndefined();
    });

    it("should throw GsEmptyConfigText for empty text", () => {
      expect(() => GeneralSettingsConfigParser.parse("")).toThrow(
        BusinessRuleError,
      );
      expect(() => GeneralSettingsConfigParser.parse("")).toThrow(
        expect.objectContaining({
          code: GeneralSettingsErrorCode.GsEmptyConfigText,
        }),
      );
    });

    it("should throw GsEmptyConfigText for whitespace-only text", () => {
      expect(() => GeneralSettingsConfigParser.parse("   \n  ")).toThrow(
        BusinessRuleError,
      );
      expect(() => GeneralSettingsConfigParser.parse("   \n  ")).toThrow(
        expect.objectContaining({
          code: GeneralSettingsErrorCode.GsEmptyConfigText,
        }),
      );
    });

    it("should throw GsInvalidConfigYaml for invalid YAML", () => {
      expect(() =>
        GeneralSettingsConfigParser.parse("{ invalid: yaml:"),
      ).toThrow(BusinessRuleError);
      expect(() =>
        GeneralSettingsConfigParser.parse("{ invalid: yaml:"),
      ).toThrow(
        expect.objectContaining({
          code: GeneralSettingsErrorCode.GsInvalidConfigYaml,
        }),
      );
    });

    it("should throw GsInvalidConfigStructure for non-object YAML", () => {
      expect(() => GeneralSettingsConfigParser.parse("just a string")).toThrow(
        BusinessRuleError,
      );
      expect(() => GeneralSettingsConfigParser.parse("just a string")).toThrow(
        expect.objectContaining({
          code: GeneralSettingsErrorCode.GsInvalidConfigStructure,
        }),
      );
    });

    it("should throw GsInvalidTheme for invalid theme", () => {
      const yaml = `
theme: PINK
`;
      expect(() => GeneralSettingsConfigParser.parse(yaml)).toThrow(
        BusinessRuleError,
      );
      expect(() => GeneralSettingsConfigParser.parse(yaml)).toThrow(
        expect.objectContaining({
          code: GeneralSettingsErrorCode.GsInvalidTheme,
        }),
      );
    });

    it("should throw GsInvalidIconType for invalid icon type", () => {
      const yaml = `
icon:
  type: INVALID
  key: APP01
`;
      expect(() => GeneralSettingsConfigParser.parse(yaml)).toThrow(
        BusinessRuleError,
      );
      expect(() => GeneralSettingsConfigParser.parse(yaml)).toThrow(
        expect.objectContaining({
          code: GeneralSettingsErrorCode.GsInvalidIconType,
        }),
      );
    });

    it("should throw GsInvalidConfigStructure for invalid icon structure", () => {
      const yaml = `
icon: not_an_object
`;
      expect(() => GeneralSettingsConfigParser.parse(yaml)).toThrow(
        BusinessRuleError,
      );
      expect(() => GeneralSettingsConfigParser.parse(yaml)).toThrow(
        expect.objectContaining({
          code: GeneralSettingsErrorCode.GsInvalidConfigStructure,
        }),
      );
    });

    it("should parse titleField with AUTO selectionMode", () => {
      const yaml = `
titleField:
  selectionMode: AUTO
`;
      const config = GeneralSettingsConfigParser.parse(yaml);

      expect(config.titleField).toEqual({ selectionMode: "AUTO" });
      expect(config.titleField?.code).toBeUndefined();
    });

    it("should throw GsInvalidConfigStructure for invalid titleField selectionMode", () => {
      const yaml = `
titleField:
  selectionMode: INVALID
`;
      expect(() => GeneralSettingsConfigParser.parse(yaml)).toThrow(
        BusinessRuleError,
      );
      expect(() => GeneralSettingsConfigParser.parse(yaml)).toThrow(
        expect.objectContaining({
          code: GeneralSettingsErrorCode.GsInvalidConfigStructure,
        }),
      );
    });

    it("should parse numberPrecision with all rounding modes", () => {
      for (const roundingMode of ["HALF_EVEN", "UP", "DOWN"]) {
        const yaml = `
numberPrecision:
  digits: 10
  decimalPlaces: 2
  roundingMode: ${roundingMode}
`;
        const config = GeneralSettingsConfigParser.parse(yaml);
        expect(config.numberPrecision?.roundingMode).toBe(roundingMode);
      }
    });

    it("should throw GsInvalidConfigStructure for invalid numberPrecision", () => {
      const yaml = `
numberPrecision: not_an_object
`;
      expect(() => GeneralSettingsConfigParser.parse(yaml)).toThrow(
        BusinessRuleError,
      );
      expect(() => GeneralSettingsConfigParser.parse(yaml)).toThrow(
        expect.objectContaining({
          code: GeneralSettingsErrorCode.GsInvalidConfigStructure,
        }),
      );
    });

    it("should throw GsInvalidConfigStructure for firstMonthOfFiscalYear out of range", () => {
      const yaml = `
firstMonthOfFiscalYear: 13
`;
      expect(() => GeneralSettingsConfigParser.parse(yaml)).toThrow(
        BusinessRuleError,
      );
      expect(() => GeneralSettingsConfigParser.parse(yaml)).toThrow(
        expect.objectContaining({
          code: GeneralSettingsErrorCode.GsInvalidConfigStructure,
        }),
      );
    });

    it("should throw GsInvalidConfigStructure for non-integer firstMonthOfFiscalYear", () => {
      const yaml = `
firstMonthOfFiscalYear: 1.5
`;
      expect(() => GeneralSettingsConfigParser.parse(yaml)).toThrow(
        BusinessRuleError,
      );
      expect(() => GeneralSettingsConfigParser.parse(yaml)).toThrow(
        expect.objectContaining({
          code: GeneralSettingsErrorCode.GsInvalidConfigStructure,
        }),
      );
    });

    it("should throw GsInvalidConfigStructure for non-number firstMonthOfFiscalYear", () => {
      const yaml = `
firstMonthOfFiscalYear: January
`;
      expect(() => GeneralSettingsConfigParser.parse(yaml)).toThrow(
        BusinessRuleError,
      );
      expect(() => GeneralSettingsConfigParser.parse(yaml)).toThrow(
        expect.objectContaining({
          code: GeneralSettingsErrorCode.GsInvalidConfigStructure,
        }),
      );
    });

    it("should parse all valid themes", () => {
      for (const theme of [
        "WHITE",
        "RED",
        "GREEN",
        "BLUE",
        "YELLOW",
        "BLACK",
        "CLIPBOARD",
        "BINDER",
        "PENCIL",
        "CLIPS",
      ]) {
        const yaml = `theme: ${theme}`;
        const config = GeneralSettingsConfigParser.parse(yaml);
        expect(config.theme).toBe(theme);
      }
    });

    it("should parse icon with FILE type", () => {
      const yaml = `
icon:
  type: FILE
  key: some-file-key
`;
      const config = GeneralSettingsConfigParser.parse(yaml);
      expect(config.icon).toEqual({ type: "FILE", key: "some-file-key" });
    });
  });
});
