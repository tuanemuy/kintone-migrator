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

      const yaml = GeneralSettingsConfigSerializer.serialize(config);

      expect(yaml).toContain("name: My App");
      expect(yaml).toContain("description: App description");
      expect(yaml).toContain("type: PRESET");
      expect(yaml).toContain("key: APP72");
      expect(yaml).toContain("theme: BLUE");
      expect(yaml).toContain("selectionMode: MANUAL");
      expect(yaml).toContain("code: title");
      expect(yaml).toContain("enableThumbnails: true");
      expect(yaml).toContain("enableBulkDeletion: false");
      expect(yaml).toContain("enableComments: true");
      expect(yaml).toContain("enableDuplicateRecord: false");
      expect(yaml).toContain("enableInlineRecordEditing: true");
      expect(yaml).toContain("digits: 12");
      expect(yaml).toContain("decimalPlaces: 4");
      expect(yaml).toContain("roundingMode: HALF_EVEN");
      expect(yaml).toContain("firstMonthOfFiscalYear: 4");
    });

    it("should serialize partial config (undefined properties omitted)", () => {
      const config: GeneralSettingsConfig = {
        name: "My App",
        theme: "RED",
      };

      const yaml = GeneralSettingsConfigSerializer.serialize(config);

      expect(yaml).toContain("name: My App");
      expect(yaml).toContain("theme: RED");
      expect(yaml).not.toContain("description");
      expect(yaml).not.toContain("icon");
      expect(yaml).not.toContain("titleField");
      expect(yaml).not.toContain("enableThumbnails");
      expect(yaml).not.toContain("numberPrecision");
      expect(yaml).not.toContain("firstMonthOfFiscalYear");
    });

    it("should serialize titleField without code when not present", () => {
      const config: GeneralSettingsConfig = {
        titleField: { selectionMode: "AUTO" },
      };

      const yaml = GeneralSettingsConfigSerializer.serialize(config);

      expect(yaml).toContain("selectionMode: AUTO");
      expect(yaml).not.toContain("code:");
    });

    it("should roundtrip parse and serialize", () => {
      const originalYaml = `
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
      const parsed = GeneralSettingsConfigParser.parse(originalYaml);
      const serialized = GeneralSettingsConfigSerializer.serialize(parsed);
      const reparsed = GeneralSettingsConfigParser.parse(serialized);

      expect(reparsed).toEqual(parsed);
    });
  });
});
