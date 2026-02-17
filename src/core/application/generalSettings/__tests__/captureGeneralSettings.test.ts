import { describe, expect, it } from "vitest";
import { setupTestGeneralSettingsContainer } from "@/core/application/__tests__/helpers";
import { isSystemError } from "@/core/application/error";
import { captureGeneralSettings } from "../captureGeneralSettings";

describe("captureGeneralSettings", () => {
  const getContainer = setupTestGeneralSettingsContainer();

  describe("success cases", () => {
    it("should capture general settings and serialize to YAML", async () => {
      const container = getContainer();
      container.generalSettingsConfigurator.setConfig({
        name: "My App",
        theme: "BLUE",
        enableThumbnails: true,
      });

      const result = await captureGeneralSettings({ container });

      expect(result.configText).toContain("My App");
      expect(result.configText).toContain("BLUE");
      expect(result.configText).toContain("enableThumbnails: true");
      expect(result.hasExistingConfig).toBe(false);
    });

    it("should detect existing config file", async () => {
      const container = getContainer();
      container.generalSettingsConfigurator.setConfig({ name: "App" });
      container.generalSettingsStorage.setContent("existing content");

      const result = await captureGeneralSettings({ container });

      expect(result.hasExistingConfig).toBe(true);
    });

    it("should report no existing config when storage is empty", async () => {
      const container = getContainer();
      container.generalSettingsConfigurator.setConfig({ name: "App" });

      const result = await captureGeneralSettings({ container });

      expect(result.hasExistingConfig).toBe(false);
    });
  });

  describe("error cases", () => {
    it("should throw SystemError when getGeneralSettings() fails", async () => {
      const container = getContainer();
      container.generalSettingsConfigurator.setFailOn("getGeneralSettings");

      await expect(captureGeneralSettings({ container })).rejects.toSatisfy(
        isSystemError,
      );
    });

    it("should throw SystemError when generalSettingsStorage.get() fails", async () => {
      const container = getContainer();
      container.generalSettingsStorage.setFailOn("get");

      await expect(captureGeneralSettings({ container })).rejects.toSatisfy(
        isSystemError,
      );
    });
  });
});
