import { describe, expect, it } from "vitest";
import { setupTestGeneralSettingsContainer } from "@/core/application/__tests__/helpers";
import { isSystemError, isValidationError } from "@/core/application/error";
import { detectGeneralSettingsDiff } from "../detectGeneralSettingsDiff";

const VALID_CONFIG = `
name: My App
theme: BLUE
enableThumbnails: true
`;

describe("detectGeneralSettingsDiff", () => {
  const getContainer = setupTestGeneralSettingsContainer();

  describe("success cases", () => {
    it("should detect no changes when configs match", async () => {
      const container = getContainer();
      container.generalSettingsStorage.setContent(VALID_CONFIG);
      container.generalSettingsConfigurator.setConfig({
        name: "My App",
        theme: "BLUE",
        enableThumbnails: true,
      });

      const result = await detectGeneralSettingsDiff({ container });

      expect(result.isEmpty).toBe(true);
      expect(result.entries).toHaveLength(0);
      expect(result.summary.total).toBe(0);
    });

    it("should detect changes when configs differ", async () => {
      const container = getContainer();
      container.generalSettingsStorage.setContent(VALID_CONFIG);
      container.generalSettingsConfigurator.setConfig({
        name: "Different App",
        theme: "RED",
        enableThumbnails: false,
      });

      const result = await detectGeneralSettingsDiff({ container });

      expect(result.isEmpty).toBe(false);
      expect(result.summary.total).toBeGreaterThan(0);
    });

    it("should detect no changes when both configs have default values", async () => {
      const container = getContainer();
      container.generalSettingsStorage.setContent(`
name: ""
theme: WHITE
`);
      container.generalSettingsConfigurator.setConfig({
        name: "",
        theme: "WHITE",
      });

      const result = await detectGeneralSettingsDiff({ container });

      expect(result.isEmpty).toBe(true);
      expect(result.summary.total).toBe(0);
    });
  });

  describe("error cases", () => {
    it("should throw ValidationError when config file not found", async () => {
      const container = getContainer();

      await expect(detectGeneralSettingsDiff({ container })).rejects.toSatisfy(
        isValidationError,
      );
    });

    it("should throw SystemError when storage.get fails", async () => {
      const container = getContainer();
      container.generalSettingsStorage.setFailOn("get");

      await expect(detectGeneralSettingsDiff({ container })).rejects.toSatisfy(
        isSystemError,
      );
    });

    it("should throw SystemError when configurator method fails", async () => {
      const container = getContainer();
      container.generalSettingsStorage.setContent(VALID_CONFIG);
      container.generalSettingsConfigurator.setFailOn("getGeneralSettings");

      await expect(detectGeneralSettingsDiff({ container })).rejects.toSatisfy(
        isSystemError,
      );
    });
  });
});
