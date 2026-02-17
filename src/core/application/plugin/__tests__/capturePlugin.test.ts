import { describe, expect, it } from "vitest";
import { setupTestPluginContainer } from "@/core/application/__tests__/helpers";
import { isSystemError } from "@/core/application/error";
import { capturePlugin } from "../capturePlugin";

describe("capturePlugin", () => {
  const getContainer = setupTestPluginContainer();

  describe("success cases", () => {
    it("should capture plugins and serialize to YAML", async () => {
      const container = getContainer();
      container.pluginConfigurator.setPlugins([
        {
          id: "djmhffjlbkikgmepoociabnpfcfjhdge",
          name: "条件分岐プラグイン",
          enabled: true,
        },
        {
          id: "abcdefghijklmnopqrstuvwxyz012345",
          name: "ルックアッププラグイン",
          enabled: true,
        },
      ]);

      const result = await capturePlugin({ container });

      expect(result.configText).toContain("djmhffjlbkikgmepoociabnpfcfjhdge");
      expect(result.configText).toContain("条件分岐プラグイン");
      expect(result.configText).toContain("abcdefghijklmnopqrstuvwxyz012345");
      expect(result.configText).toContain("ルックアッププラグイン");
      expect(result.hasExistingConfig).toBe(false);
    });

    it("should detect existing config file", async () => {
      const container = getContainer();
      container.pluginConfigurator.setPlugins([]);
      container.pluginStorage.setContent("existing content");

      const result = await capturePlugin({ container });

      expect(result.hasExistingConfig).toBe(true);
    });

    it("should report no existing config when storage is empty", async () => {
      const container = getContainer();
      container.pluginConfigurator.setPlugins([]);

      const result = await capturePlugin({ container });

      expect(result.hasExistingConfig).toBe(false);
    });
  });

  describe("error cases", () => {
    it("should throw SystemError when getPlugins() fails", async () => {
      const container = getContainer();
      container.pluginConfigurator.setFailOn("getPlugins");

      await expect(capturePlugin({ container })).rejects.toSatisfy(
        isSystemError,
      );
    });

    it("should throw SystemError when pluginStorage.get() fails", async () => {
      const container = getContainer();
      container.pluginStorage.setFailOn("get");

      await expect(capturePlugin({ container })).rejects.toSatisfy(
        isSystemError,
      );
    });
  });
});
