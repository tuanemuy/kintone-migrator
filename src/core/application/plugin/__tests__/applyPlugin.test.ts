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

      const output = await applyPlugin({ container });

      expect(container.pluginConfigurator.callLog).toEqual([
        "getPlugins",
        "addPlugins",
      ]);
      expect(container.pluginConfigurator.lastAddPluginsParams?.ids).toEqual([
        "djmhffjlbkikgmepoociabnpfcfjhdge",
        "abcdefghijklmnopqrstuvwxyz012345",
      ]);
      expect(output.addedPluginIds).toEqual([
        "djmhffjlbkikgmepoociabnpfcfjhdge",
        "abcdefghijklmnopqrstuvwxyz012345",
      ]);
      expect(output.skipped).toEqual([]);
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

      const output = await applyPlugin({ container });

      expect(container.pluginConfigurator.callLog).toEqual(["getPlugins"]);
      expect(container.pluginConfigurator.lastAddPluginsParams).toBeNull();
      expect(output.addedPluginIds).toEqual([]);
      expect(output.skipped).toEqual([]);
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

      const output = await applyPlugin({ container });

      expect(container.pluginConfigurator.callLog).toEqual([
        "getPlugins",
        "addPlugins",
      ]);
      expect(container.pluginConfigurator.lastAddPluginsParams?.ids).toEqual([
        "abcdefghijklmnopqrstuvwxyz012345",
      ]);
      expect(output.addedPluginIds).toEqual([
        "abcdefghijklmnopqrstuvwxyz012345",
      ]);
      expect(output.skipped).toEqual([]);
    });
  });

  describe("enabled: false handling", () => {
    it("should not add an enabled:false plugin and surface it as skipped (disabled)", async () => {
      const container = getContainer();
      container.pluginStorage.setContent(`
plugins:
  - id: djmhffjlbkikgmepoociabnpfcfjhdge
    name: 条件分岐プラグイン
    enabled: true
  - id: abcdefghijklmnopqrstuvwxyz012345
    name: ルックアッププラグイン
    enabled: false
`);

      const output = await applyPlugin({ container });

      expect(container.pluginConfigurator.lastAddPluginsParams?.ids).toEqual([
        "djmhffjlbkikgmepoociabnpfcfjhdge",
      ]);
      expect(output.addedPluginIds).toEqual([
        "djmhffjlbkikgmepoociabnpfcfjhdge",
      ]);
      expect(output.skipped).toEqual([
        {
          pluginId: "abcdefghijklmnopqrstuvwxyz012345",
          reason: "disabled",
        },
      ]);
    });

    it("should not call addPlugins when only enabled:false plugins exist but still report them as skipped", async () => {
      const container = getContainer();
      container.pluginStorage.setContent(`
plugins:
  - id: abcdefghijklmnopqrstuvwxyz012345
    name: ルックアッププラグイン
    enabled: false
`);

      const output = await applyPlugin({ container });

      expect(container.pluginConfigurator.callLog).toEqual(["getPlugins"]);
      expect(container.pluginConfigurator.lastAddPluginsParams).toBeNull();
      expect(output.addedPluginIds).toEqual([]);
      expect(output.skipped).toEqual([
        {
          pluginId: "abcdefghijklmnopqrstuvwxyz012345",
          reason: "disabled",
        },
      ]);
    });

    it("should NOT warn about an already-added plugin whose remote is already enabled:false (avoid noise)", async () => {
      const container = getContainer();
      container.pluginStorage.setContent(`
plugins:
  - id: abcdefghijklmnopqrstuvwxyz012345
    name: ルックアッププラグイン
    enabled: false
`);
      container.pluginConfigurator.setPlugins([
        {
          id: "abcdefghijklmnopqrstuvwxyz012345",
          name: "ルックアッププラグイン",
          enabled: false,
        },
      ]);

      const output = await applyPlugin({ container });

      expect(container.pluginConfigurator.callLog).toEqual(["getPlugins"]);
      expect(container.pluginConfigurator.lastAddPluginsParams).toBeNull();
      expect(output.addedPluginIds).toEqual([]);
      expect(output.skipped).toEqual([]);
    });

    it("should warn about an already-added plugin whose remote is enabled:true but local is enabled:false (disable intent, API-unsupported)", async () => {
      const container = getContainer();
      container.pluginStorage.setContent(`
plugins:
  - id: abcdefghijklmnopqrstuvwxyz012345
    name: ルックアッププラグイン
    enabled: false
`);
      container.pluginConfigurator.setPlugins([
        {
          id: "abcdefghijklmnopqrstuvwxyz012345",
          name: "ルックアッププラグイン",
          enabled: true,
        },
      ]);

      const output = await applyPlugin({ container });

      expect(container.pluginConfigurator.callLog).toEqual(["getPlugins"]);
      expect(container.pluginConfigurator.lastAddPluginsParams).toBeNull();
      expect(output.addedPluginIds).toEqual([]);
      expect(output.skipped).toEqual([
        {
          pluginId: "abcdefghijklmnopqrstuvwxyz012345",
          reason: "disabled",
        },
      ]);
    });

    it("should keep remote-only plugins (merge; never deletes them)", async () => {
      const container = getContainer();
      container.pluginStorage.setContent(`
plugins:
  - id: djmhffjlbkikgmepoociabnpfcfjhdge
    name: 条件分岐プラグイン
`);
      container.pluginConfigurator.setPlugins([
        {
          id: "remoteonlyplugin0000000000000000",
          name: "リモート専用プラグイン",
          enabled: true,
        },
      ]);

      const output = await applyPlugin({ container });

      expect(container.pluginConfigurator.lastAddPluginsParams?.ids).toEqual([
        "djmhffjlbkikgmepoociabnpfcfjhdge",
      ]);
      expect(output.addedPluginIds).toEqual([
        "djmhffjlbkikgmepoociabnpfcfjhdge",
      ]);
      expect(output.skipped).toEqual([]);
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
