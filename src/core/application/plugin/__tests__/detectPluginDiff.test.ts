import { describe, expect, it } from "vitest";
import { setupTestPluginContainer } from "@/core/application/__tests__/helpers";
import { isSystemError, isValidationError } from "@/core/application/error";
import { detectPluginDiff } from "../detectPluginDiff";

const VALID_CONFIG = `
plugins:
  - id: djmhffjlbkikgmepoociabnpfcfjhdge
    name: Test Plugin
`;

describe("detectPluginDiff", () => {
  const getContainer = setupTestPluginContainer();

  describe("success cases", () => {
    it("should detect no changes when configs match", async () => {
      const container = getContainer();
      container.pluginStorage.setContent(VALID_CONFIG);
      container.pluginConfigurator.setPlugins([
        {
          id: "djmhffjlbkikgmepoociabnpfcfjhdge",
          name: "Test Plugin",
          enabled: true,
        },
      ]);

      const result = await detectPluginDiff({ container });

      expect(result.isEmpty).toBe(true);
      expect(result.entries).toHaveLength(0);
      expect(result.summary.total).toBe(0);
    });

    it("should detect changes when configs differ", async () => {
      const container = getContainer();
      container.pluginStorage.setContent(VALID_CONFIG);
      container.pluginConfigurator.setPlugins([]);

      const result = await detectPluginDiff({ container });

      expect(result.isEmpty).toBe(false);
      expect(result.summary.added).toBe(1);
      expect(result.entries[0].type).toBe("added");
    });

    it("should detect modified plugin", async () => {
      const container = getContainer();
      container.pluginStorage.setContent(VALID_CONFIG);
      container.pluginConfigurator.setPlugins([
        {
          id: "djmhffjlbkikgmepoociabnpfcfjhdge",
          name: "Renamed Plugin",
          enabled: true,
        },
      ]);

      const result = await detectPluginDiff({ container });

      expect(result.isEmpty).toBe(false);
      expect(result.summary.modified).toBe(1);
      expect(result.entries[0].type).toBe("modified");
    });

    it("should detect deleted plugin", async () => {
      const container = getContainer();
      container.pluginStorage.setContent(`
plugins: []
`);
      container.pluginConfigurator.setPlugins([
        {
          id: "djmhffjlbkikgmepoociabnpfcfjhdge",
          name: "Test Plugin",
          enabled: true,
        },
      ]);

      const result = await detectPluginDiff({ container });

      expect(result.isEmpty).toBe(false);
      expect(result.summary.deleted).toBe(1);
      expect(result.entries[0].type).toBe("deleted");
    });
  });

  describe("error cases", () => {
    it("should throw ValidationError when config file not found", async () => {
      const container = getContainer();

      await expect(detectPluginDiff({ container })).rejects.toSatisfy(
        (error) => isValidationError(error) && error.code === "INVALID_INPUT",
      );
    });

    it("should throw SystemError when storage.get fails", async () => {
      const container = getContainer();
      container.pluginStorage.setFailOn("get");

      await expect(detectPluginDiff({ container })).rejects.toSatisfy(
        isSystemError,
      );
    });

    it("should throw SystemError when configurator method fails", async () => {
      const container = getContainer();
      container.pluginStorage.setContent(VALID_CONFIG);
      container.pluginConfigurator.setFailOn("getPlugins");

      await expect(detectPluginDiff({ container })).rejects.toSatisfy(
        isSystemError,
      );
    });

    it("should throw ValidationError when config has invalid YAML", async () => {
      const container = getContainer();
      container.pluginStorage.setContent("{{invalid yaml");

      await expect(detectPluginDiff({ container })).rejects.toSatisfy(
        isValidationError,
      );
    });
  });
});
