import { describe, expect, it } from "vitest";
import { setupTestGeneralSettingsContainer } from "@/core/application/__tests__/helpers";
import { isSystemError, isValidationError } from "@/core/application/error";
import { applyGeneralSettings } from "../applyGeneralSettings";

const VALID_CONFIG = `
name: My App
description: App description
theme: BLUE
enableThumbnails: true
enableBulkDeletion: false
numberPrecision:
  digits: 12
  decimalPlaces: 4
  roundingMode: HALF_EVEN
firstMonthOfFiscalYear: 4
`;

describe("applyGeneralSettings", () => {
  const getContainer = setupTestGeneralSettingsContainer();

  describe("success cases", () => {
    it("should read config, parse, get revision, and update general settings", async () => {
      const container = getContainer();
      container.generalSettingsStorage.setContent(VALID_CONFIG);

      await applyGeneralSettings({ container });

      expect(container.generalSettingsConfigurator.callLog).toEqual([
        "getGeneralSettings",
        "updateGeneralSettings",
      ]);
      expect(
        container.generalSettingsConfigurator.lastUpdateParams?.config.name,
      ).toBe("My App");
      expect(
        container.generalSettingsConfigurator.lastUpdateParams?.config.theme,
      ).toBe("BLUE");
    });

    it("should pass revision from current settings", async () => {
      const container = getContainer();
      container.generalSettingsStorage.setContent(VALID_CONFIG);
      container.generalSettingsConfigurator.setConfig({}, "42");

      await applyGeneralSettings({ container });

      expect(
        container.generalSettingsConfigurator.lastUpdateParams?.revision,
      ).toBe("42");
    });
  });

  describe("error cases", () => {
    it("should throw ValidationError when config file does not exist", async () => {
      const container = getContainer();

      await expect(applyGeneralSettings({ container })).rejects.toSatisfy(
        isValidationError,
      );
    });

    it("should throw ValidationError for invalid YAML config", async () => {
      const container = getContainer();
      container.generalSettingsStorage.setContent("{ invalid: yaml:");

      await expect(applyGeneralSettings({ container })).rejects.toSatisfy(
        isValidationError,
      );
    });

    it("should throw SystemError when generalSettingsStorage.get() fails", async () => {
      const container = getContainer();
      container.generalSettingsStorage.setFailOn("get");

      await expect(applyGeneralSettings({ container })).rejects.toSatisfy(
        isSystemError,
      );
    });

    it("should throw SystemError when getGeneralSettings() fails", async () => {
      const container = getContainer();
      container.generalSettingsStorage.setContent(VALID_CONFIG);
      container.generalSettingsConfigurator.setFailOn("getGeneralSettings");

      await expect(applyGeneralSettings({ container })).rejects.toSatisfy(
        isSystemError,
      );
    });

    it("should throw SystemError when updateGeneralSettings() fails", async () => {
      const container = getContainer();
      container.generalSettingsStorage.setContent(VALID_CONFIG);
      container.generalSettingsConfigurator.setFailOn("updateGeneralSettings");

      await expect(applyGeneralSettings({ container })).rejects.toSatisfy(
        isSystemError,
      );
    });
  });
});
