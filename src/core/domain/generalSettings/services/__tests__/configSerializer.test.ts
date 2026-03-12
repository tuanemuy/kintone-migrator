import { describe, expect, it } from "vitest";
import type { GeneralSettingsConfig } from "../../entity";
import { GeneralSettingsConfigParser } from "../configParser";
import { GeneralSettingsConfigSerializer } from "../configSerializer";

describe("GeneralSettingsConfigSerializer", () => {
  describe("serialize", () => {
    it("should serialize config with all properties", () => {
      const config: GeneralSettingsConfig = {
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
      };

      const result = GeneralSettingsConfigSerializer.serialize(config);

      expect(result.name).toBe("My App");
      expect(result.description).toBe("App description");

      const icon = result.icon as Record<string, unknown>;
      expect(icon.type).toBe("PRESET");
      expect(icon.key).toBe("APP72");

      expect(result.theme).toBe("BLUE");

      const titleField = result.titleField as Record<string, unknown>;
      expect(titleField.selectionMode).toBe("MANUAL");
      expect(titleField.code).toBe("title");

      expect(result.enableThumbnails).toBe(true);
      expect(result.enableBulkDeletion).toBe(false);
      expect(result.enableComments).toBe(true);
      expect(result.enableDuplicateRecord).toBe(false);
      expect(result.enableInlineRecordEditing).toBe(true);

      const numberPrecision = result.numberPrecision as Record<string, unknown>;
      expect(numberPrecision.digits).toBe(12);
      expect(numberPrecision.decimalPlaces).toBe(4);
      expect(numberPrecision.roundingMode).toBe("HALF_EVEN");

      expect(result.firstMonthOfFiscalYear).toBe(4);
    });

    it("should serialize partial config (undefined properties omitted)", () => {
      const config: GeneralSettingsConfig = {
        name: "My App",
        theme: "RED",
      };

      const result = GeneralSettingsConfigSerializer.serialize(config);

      expect(result.name).toBe("My App");
      expect(result.theme).toBe("RED");
      expect(result).not.toHaveProperty("description");
      expect(result).not.toHaveProperty("icon");
      expect(result).not.toHaveProperty("titleField");
      expect(result).not.toHaveProperty("enableThumbnails");
      expect(result).not.toHaveProperty("numberPrecision");
      expect(result).not.toHaveProperty("firstMonthOfFiscalYear");
    });

    it("should serialize titleField without code when not present", () => {
      const config: GeneralSettingsConfig = {
        titleField: { selectionMode: "AUTO" },
      };

      const result = GeneralSettingsConfigSerializer.serialize(config);
      const titleField = result.titleField as Record<string, unknown>;

      expect(titleField.selectionMode).toBe("AUTO");
      expect(titleField).not.toHaveProperty("code");
    });

    it("should roundtrip parse and serialize", () => {
      const input = {
        name: "My App",
        description: "App description",
        icon: {
          type: "PRESET",
          key: "APP72",
        },
        theme: "BLUE",
        titleField: {
          selectionMode: "MANUAL",
          code: "title",
        },
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
      };
      const parsed = GeneralSettingsConfigParser.parse(input);
      const serialized = GeneralSettingsConfigSerializer.serialize(parsed);
      const reparsed = GeneralSettingsConfigParser.parse(serialized);

      expect(reparsed).toEqual(parsed);
    });
  });
});
