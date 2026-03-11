import { describe, expect, it } from "vitest";
import { GeneralSettingsErrorCode } from "../../errorCode";
import { GeneralSettingsConfigParser } from "../configParser";

describe("GeneralSettingsConfigParser", () => {
  describe("parse", () => {
    it("should parse a valid config with all properties", () => {
      const config = GeneralSettingsConfigParser.parse({
        name: "My App",
        description: "App description",
        icon: { type: "PRESET", key: "APP72" },
        theme: "BLUE",
        titleField: { selectionMode: "MANUAL", code: "title" },
        enableThumbnails: true,
        enableBulkDeletion: false,
        enableComments: true,
        enableDuplicateRecord: false,
        enableInlineRecordEditing: true,
        numberPrecision: {
          digits: 12,
          decimalPlaces: 4,
          roundingMode: "HALF_EVEN",
        },
        firstMonthOfFiscalYear: 4,
      });

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
      const config = GeneralSettingsConfigParser.parse({
        name: "My App",
        theme: "RED",
      });

      expect(config.name).toBe("My App");
      expect(config.theme).toBe("RED");
      expect(config.description).toBeUndefined();
      expect(config.icon).toBeUndefined();
      expect(config.titleField).toBeUndefined();
      expect(config.enableThumbnails).toBeUndefined();
      expect(config.numberPrecision).toBeUndefined();
      expect(config.firstMonthOfFiscalYear).toBeUndefined();
    });

    it("should throw GsInvalidConfigStructure for non-object input", () => {
      expect(() => GeneralSettingsConfigParser.parse("just a string")).toThrow(
        expect.objectContaining({
          code: GeneralSettingsErrorCode.GsInvalidConfigStructure,
        }),
      );
    });

    it("should throw GsInvalidConfigStructure for array input", () => {
      expect(() => GeneralSettingsConfigParser.parse(["item1"])).toThrow(
        expect.objectContaining({
          code: GeneralSettingsErrorCode.GsInvalidConfigStructure,
        }),
      );
    });

    it("should throw GsInvalidConfigStructure for null input", () => {
      expect(() => GeneralSettingsConfigParser.parse(null)).toThrow(
        expect.objectContaining({
          code: GeneralSettingsErrorCode.GsInvalidConfigStructure,
        }),
      );
    });

    it("should throw GsInvalidTheme for invalid theme", () => {
      expect(() =>
        GeneralSettingsConfigParser.parse({ theme: "PINK" }),
      ).toThrow(
        expect.objectContaining({
          code: GeneralSettingsErrorCode.GsInvalidTheme,
        }),
      );
    });

    it("should throw GsInvalidIconType for invalid icon type", () => {
      expect(() =>
        GeneralSettingsConfigParser.parse({
          icon: { type: "INVALID", key: "APP01" },
        }),
      ).toThrow(
        expect.objectContaining({
          code: GeneralSettingsErrorCode.GsInvalidIconType,
        }),
      );
    });

    it("should throw GsInvalidConfigStructure for invalid icon structure", () => {
      expect(() =>
        GeneralSettingsConfigParser.parse({ icon: "not_an_object" }),
      ).toThrow(
        expect.objectContaining({
          code: GeneralSettingsErrorCode.GsInvalidConfigStructure,
        }),
      );
    });

    it("should parse titleField with AUTO selectionMode", () => {
      const config = GeneralSettingsConfigParser.parse({
        titleField: { selectionMode: "AUTO" },
      });

      expect(config.titleField).toEqual({ selectionMode: "AUTO" });
      expect(config.titleField?.code).toBeUndefined();
    });

    it("should throw GsInvalidConfigStructure for invalid titleField selectionMode", () => {
      expect(() =>
        GeneralSettingsConfigParser.parse({
          titleField: { selectionMode: "INVALID" },
        }),
      ).toThrow(
        expect.objectContaining({
          code: GeneralSettingsErrorCode.GsInvalidConfigStructure,
        }),
      );
    });

    it("should parse numberPrecision with all rounding modes", () => {
      for (const roundingMode of ["HALF_EVEN", "UP", "DOWN"]) {
        const config = GeneralSettingsConfigParser.parse({
          numberPrecision: {
            digits: 10,
            decimalPlaces: 2,
            roundingMode,
          },
        });
        expect(config.numberPrecision?.roundingMode).toBe(roundingMode);
      }
    });

    it("should throw GsInvalidConfigStructure for invalid numberPrecision", () => {
      expect(() =>
        GeneralSettingsConfigParser.parse({
          numberPrecision: "not_an_object",
        }),
      ).toThrow(
        expect.objectContaining({
          code: GeneralSettingsErrorCode.GsInvalidConfigStructure,
        }),
      );
    });

    it("should throw GsInvalidConfigStructure for firstMonthOfFiscalYear out of range", () => {
      expect(() =>
        GeneralSettingsConfigParser.parse({ firstMonthOfFiscalYear: 13 }),
      ).toThrow(
        expect.objectContaining({
          code: GeneralSettingsErrorCode.GsInvalidConfigStructure,
        }),
      );
    });

    it("should throw GsInvalidConfigStructure for non-integer firstMonthOfFiscalYear", () => {
      expect(() =>
        GeneralSettingsConfigParser.parse({ firstMonthOfFiscalYear: 1.5 }),
      ).toThrow(
        expect.objectContaining({
          code: GeneralSettingsErrorCode.GsInvalidConfigStructure,
        }),
      );
    });

    it("should throw GsInvalidConfigStructure for non-number firstMonthOfFiscalYear", () => {
      expect(() =>
        GeneralSettingsConfigParser.parse({
          firstMonthOfFiscalYear: "January",
        }),
      ).toThrow(
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
        const config = GeneralSettingsConfigParser.parse({ theme });
        expect(config.theme).toBe(theme);
      }
    });

    it("should parse icon with FILE type", () => {
      const config = GeneralSettingsConfigParser.parse({
        icon: { type: "FILE", key: "some-file-key" },
      });
      expect(config.icon).toEqual({ type: "FILE", key: "some-file-key" });
    });

    it("should throw for non-string name", () => {
      expect(() => GeneralSettingsConfigParser.parse({ name: 123 })).toThrow(
        expect.objectContaining({
          code: GeneralSettingsErrorCode.GsInvalidConfigStructure,
        }),
      );
    });

    it("should throw for non-string description", () => {
      expect(() =>
        GeneralSettingsConfigParser.parse({ description: 123 }),
      ).toThrow(
        expect.objectContaining({
          code: GeneralSettingsErrorCode.GsInvalidConfigStructure,
        }),
      );
    });

    it("should throw for non-string titleField.code", () => {
      expect(() =>
        GeneralSettingsConfigParser.parse({
          titleField: { selectionMode: "MANUAL", code: 123 },
        }),
      ).toThrow(
        expect.objectContaining({
          code: GeneralSettingsErrorCode.GsInvalidConfigStructure,
        }),
      );
    });

    it("should throw for non-object titleField", () => {
      expect(() =>
        GeneralSettingsConfigParser.parse({ titleField: "not_an_object" }),
      ).toThrow(
        expect.objectContaining({
          code: GeneralSettingsErrorCode.GsInvalidConfigStructure,
        }),
      );
    });

    it("should throw for icon with empty key", () => {
      expect(() =>
        GeneralSettingsConfigParser.parse({
          icon: { type: "PRESET", key: "" },
        }),
      ).toThrow(
        expect.objectContaining({
          code: GeneralSettingsErrorCode.GsInvalidConfigStructure,
        }),
      );
    });

    it("should throw for numberPrecision with non-number digits", () => {
      expect(() =>
        GeneralSettingsConfigParser.parse({
          numberPrecision: {
            digits: "abc",
            decimalPlaces: 2,
            roundingMode: "HALF_EVEN",
          },
        }),
      ).toThrow(
        expect.objectContaining({
          code: GeneralSettingsErrorCode.GsInvalidConfigStructure,
        }),
      );
    });

    it("should throw for numberPrecision with non-number decimalPlaces", () => {
      expect(() =>
        GeneralSettingsConfigParser.parse({
          numberPrecision: {
            digits: 12,
            decimalPlaces: "abc",
            roundingMode: "HALF_EVEN",
          },
        }),
      ).toThrow(
        expect.objectContaining({
          code: GeneralSettingsErrorCode.GsInvalidConfigStructure,
        }),
      );
    });

    it("should throw for numberPrecision with invalid roundingMode", () => {
      expect(() =>
        GeneralSettingsConfigParser.parse({
          numberPrecision: {
            digits: 12,
            decimalPlaces: 2,
            roundingMode: "INVALID",
          },
        }),
      ).toThrow(
        expect.objectContaining({
          code: GeneralSettingsErrorCode.GsInvalidConfigStructure,
        }),
      );
    });

    it("should throw for firstMonthOfFiscalYear less than 1", () => {
      expect(() =>
        GeneralSettingsConfigParser.parse({ firstMonthOfFiscalYear: 0 }),
      ).toThrow(
        expect.objectContaining({
          code: GeneralSettingsErrorCode.GsInvalidConfigStructure,
        }),
      );
    });

    it("should throw GsInvalidNumberPrecision for negative digits", () => {
      expect(() =>
        GeneralSettingsConfigParser.parse({
          numberPrecision: {
            digits: -1,
            decimalPlaces: 2,
            roundingMode: "HALF_EVEN",
          },
        }),
      ).toThrow(
        expect.objectContaining({
          code: GeneralSettingsErrorCode.GsInvalidNumberPrecision,
        }),
      );
    });

    it("should throw GsInvalidNumberPrecision for negative decimalPlaces", () => {
      expect(() =>
        GeneralSettingsConfigParser.parse({
          numberPrecision: {
            digits: 12,
            decimalPlaces: -3,
            roundingMode: "HALF_EVEN",
          },
        }),
      ).toThrow(
        expect.objectContaining({
          code: GeneralSettingsErrorCode.GsInvalidNumberPrecision,
        }),
      );
    });

    it("should throw GsInvalidNumberPrecision for non-integer digits", () => {
      expect(() =>
        GeneralSettingsConfigParser.parse({
          numberPrecision: {
            digits: 12.5,
            decimalPlaces: 2,
            roundingMode: "HALF_EVEN",
          },
        }),
      ).toThrow(
        expect.objectContaining({
          code: GeneralSettingsErrorCode.GsInvalidNumberPrecision,
        }),
      );
    });

    it("should throw GsInvalidBooleanField for non-boolean enableThumbnails", () => {
      expect(() =>
        GeneralSettingsConfigParser.parse({ enableThumbnails: "yes" }),
      ).toThrow(
        expect.objectContaining({
          code: GeneralSettingsErrorCode.GsInvalidBooleanField,
        }),
      );
    });
  });
});
