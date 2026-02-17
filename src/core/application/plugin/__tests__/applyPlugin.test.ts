import { describe, expect, it } from "vitest";
import { setupTestPluginContainer } from "@/core/application/__tests__/helpers";
import { isSystemError, isValidationError } from "@/core/application/error";
import { applyPlugin } from "../applyPlugin";

const VALID_CONFIG = `
plugins:
  - id: djmhffjlbkikgmepoociabnpfcfjhdge
    name: 条件分岐プラグイン
  - id: abcdefghijklmnopqrstuvwxyz012345
    name: ルックアッププラグイン
`;

describe("applyPlugin", () => {
  const getContainer = setupTestPluginContainer();

  describe("success cases", () => {
    it("should add missing plugins to the app", async () => {
      const container = getContainer();
      container.pluginStorage.setContent(VALID_CONFIG);

      await applyPlugin({ container });

      expect(container.pluginConfigurator.callLog).toEqual([
        "getPlugins",
        "addPlugins",
      ]);
      expect(container.pluginConfigurator.lastAddPluginsParams?.ids).toEqual([
        "djmhffjlbkikgmepoociabnpfcfjhdge",
        "abcdefghijklmnopqrstuvwxyz012345",
      ]);
    });

    it("should not call addPlugins when all plugins already exist", async () => {
      const container = getContainer();
      container.pluginStorage.setContent(VALID_CONFIG);
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

      await applyPlugin({ container });

      expect(container.pluginConfigurator.callLog).toEqual(["getPlugins"]);
      expect(container.pluginConfigurator.lastAddPluginsParams).toBeNull();
    });

    it("should only add plugins that are missing", async () => {
      const container = getContainer();
      container.pluginStorage.setContent(VALID_CONFIG);
      container.pluginConfigurator.setPlugins([
        {
          id: "djmhffjlbkikgmepoociabnpfcfjhdge",
          name: "条件分岐プラグイン",
          enabled: true,
        },
      ]);

      await applyPlugin({ container });

      expect(container.pluginConfigurator.callLog).toEqual([
        "getPlugins",
        "addPlugins",
      ]);
      expect(container.pluginConfigurator.lastAddPluginsParams?.ids).toEqual([
        "abcdefghijklmnopqrstuvwxyz012345",
      ]);
    });
  });

  describe("error cases", () => {
    it("should throw ValidationError when config file not found", async () => {
      const container = getContainer();

      await expect(applyPlugin({ container })).rejects.toSatisfy(
        isValidationError,
      );
    });

    it("should throw ValidationError for invalid YAML config", async () => {
      const container = getContainer();
      container.pluginStorage.setContent("{ invalid: yaml:");

      await expect(applyPlugin({ container })).rejects.toSatisfy(
        isValidationError,
      );
    });

    it("should throw SystemError when pluginStorage.get() fails", async () => {
      const container = getContainer();
      container.pluginStorage.setFailOn("get");

      await expect(applyPlugin({ container })).rejects.toSatisfy(isSystemError);
    });

    it("should throw SystemError when getPlugins() fails", async () => {
      const container = getContainer();
      container.pluginStorage.setContent(VALID_CONFIG);
      container.pluginConfigurator.setFailOn("getPlugins");

      await expect(applyPlugin({ container })).rejects.toSatisfy(isSystemError);
    });

    it("should throw SystemError when addPlugins() fails", async () => {
      const container = getContainer();
      container.pluginStorage.setContent(VALID_CONFIG);
      container.pluginConfigurator.setFailOn("addPlugins");

      await expect(applyPlugin({ container })).rejects.toSatisfy(isSystemError);
    });
  });
});
