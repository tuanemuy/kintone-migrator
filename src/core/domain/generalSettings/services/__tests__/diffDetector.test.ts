import { describe, expect, it } from "vitest";
import type { GeneralSettingsConfig } from "../../entity";
import { GeneralSettingsDiffDetector } from "../diffDetector";

function makeConfig(
  overrides: Partial<GeneralSettingsConfig> = {},
): GeneralSettingsConfig {
  return {
    name: "Test App",
    description: "A test app",
    theme: "WHITE",
    enableThumbnails: false,
    enableBulkDeletion: false,
    enableComments: true,
    enableDuplicateRecord: false,
    enableInlineRecordEditing: false,
    firstMonthOfFiscalYear: 1,
    ...overrides,
  };
}

describe("GeneralSettingsDiffDetector", () => {
  describe("no changes", () => {
    it("should return empty diff when configs are identical", () => {
      const config = makeConfig();
      const result = GeneralSettingsDiffDetector.detect(config, config);
      expect(result.isEmpty).toBe(true);
      expect(result.entries).toHaveLength(0);
    });
  });

  describe("modified fields", () => {
    it("should detect name change", () => {
      const local = makeConfig({ name: "New Name" });
      const remote = makeConfig({ name: "Old Name" });
      const result = GeneralSettingsDiffDetector.detect(local, remote);
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].field).toBe("name");
      expect(result.entries[0].details).toContain("Old Name");
      expect(result.entries[0].details).toContain("New Name");
    });

    it("should detect description change", () => {
      const local = makeConfig({ description: "new desc" });
      const remote = makeConfig({ description: "old desc" });
      const result = GeneralSettingsDiffDetector.detect(local, remote);
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].field).toBe("description");
    });

    it("should detect theme change", () => {
      const local = makeConfig({ theme: "RED" });
      const remote = makeConfig({ theme: "BLUE" });
      const result = GeneralSettingsDiffDetector.detect(local, remote);
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].field).toBe("theme");
    });

    it("should detect icon change", () => {
      const local = makeConfig({ icon: { type: "PRESET", key: "APP72" } });
      const remote = makeConfig({ icon: { type: "PRESET", key: "APP1" } });
      const result = GeneralSettingsDiffDetector.detect(local, remote);
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].field).toBe("icon");
    });

    it("should detect titleField change", () => {
      const local = makeConfig({
        titleField: { selectionMode: "MANUAL", code: "field1" },
      });
      const remote = makeConfig({
        titleField: { selectionMode: "AUTO" },
      });
      const result = GeneralSettingsDiffDetector.detect(local, remote);
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].field).toBe("titleField");
    });

    it("should detect boolean flag changes", () => {
      const local = makeConfig({ enableThumbnails: true });
      const remote = makeConfig({ enableThumbnails: false });
      const result = GeneralSettingsDiffDetector.detect(local, remote);
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].field).toBe("enableThumbnails");
    });

    it("should detect numberPrecision change", () => {
      const local = makeConfig({
        numberPrecision: { digits: 10, decimalPlaces: 2, roundingMode: "UP" },
      });
      const remote = makeConfig({
        numberPrecision: {
          digits: 10,
          decimalPlaces: 4,
          roundingMode: "HALF_EVEN",
        },
      });
      const result = GeneralSettingsDiffDetector.detect(local, remote);
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].field).toBe("numberPrecision");
    });

    it("should detect firstMonthOfFiscalYear change", () => {
      const local = makeConfig({ firstMonthOfFiscalYear: 4 });
      const remote = makeConfig({ firstMonthOfFiscalYear: 1 });
      const result = GeneralSettingsDiffDetector.detect(local, remote);
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].field).toBe("firstMonthOfFiscalYear");
    });
  });

  describe("optional field handling", () => {
    it("should treat undefined and empty string as equal for name", () => {
      const local = makeConfig({ name: undefined });
      const remote = makeConfig({ name: "" });
      const result = GeneralSettingsDiffDetector.detect(local, remote);
      expect(result.isEmpty).toBe(true);
    });

    it("should treat undefined and false as equal for boolean fields", () => {
      const local = makeConfig({ enableThumbnails: undefined });
      const remote = makeConfig({ enableThumbnails: false });
      const result = GeneralSettingsDiffDetector.detect(local, remote);
      expect(result.isEmpty).toBe(true);
    });

    it("should treat undefined and 1 as equal for firstMonthOfFiscalYear", () => {
      const local = makeConfig({ firstMonthOfFiscalYear: undefined });
      const remote = makeConfig({ firstMonthOfFiscalYear: 1 });
      const result = GeneralSettingsDiffDetector.detect(local, remote);
      expect(result.isEmpty).toBe(true);
    });
  });

  describe("multiple changes", () => {
    it("should detect multiple field changes", () => {
      const local = makeConfig({
        name: "New",
        theme: "RED",
        enableComments: false,
      });
      const remote = makeConfig({
        name: "Old",
        theme: "BLUE",
        enableComments: true,
      });
      const result = GeneralSettingsDiffDetector.detect(local, remote);
      expect(result.entries).toHaveLength(3);
      expect(result.summary.modified).toBe(3);
      expect(result.summary.total).toBe(3);
    });
  });

  describe("added/deleted are always 0", () => {
    it("should always have 0 added and 0 deleted", () => {
      const local = makeConfig({ name: "new" });
      const remote = makeConfig({ name: "old" });
      const result = GeneralSettingsDiffDetector.detect(local, remote);
      expect(result.summary.added).toBe(0);
      expect(result.summary.deleted).toBe(0);
    });
  });
});
