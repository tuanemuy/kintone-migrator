import { describe, expect, it } from "vitest";
import type { PluginConfig, PluginsConfig } from "../../entity";
import { PluginDiffDetector } from "../diffDetector";

function makePlugin(overrides: Partial<PluginConfig> = {}): PluginConfig {
  return {
    id: "plugin1",
    name: "Test Plugin",
    enabled: true,
    ...overrides,
  };
}

function makeConfig(plugins: PluginConfig[] = []): PluginsConfig {
  return { plugins };
}

describe("PluginDiffDetector", () => {
  describe("no changes", () => {
    it("should return empty diff when configs are identical", () => {
      const local = makeConfig([makePlugin()]);
      const remote = makeConfig([makePlugin()]);
      const result = PluginDiffDetector.detect(local, remote);
      expect(result.isEmpty).toBe(true);
      expect(result.entries).toHaveLength(0);
    });

    it("should return empty diff when both are empty", () => {
      const result = PluginDiffDetector.detect(makeConfig(), makeConfig());
      expect(result.isEmpty).toBe(true);
    });
  });

  describe("added plugins", () => {
    it("should detect added plugin", () => {
      const local = makeConfig([makePlugin()]);
      const result = PluginDiffDetector.detect(local, makeConfig());
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].type).toBe("added");
      expect(result.entries[0].pluginId).toBe("plugin1");
      expect(result.summary.added).toBe(1);
    });
  });

  describe("deleted plugins", () => {
    it("should detect deleted plugin", () => {
      const remote = makeConfig([makePlugin()]);
      const result = PluginDiffDetector.detect(makeConfig(), remote);
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].type).toBe("deleted");
      expect(result.entries[0].pluginId).toBe("plugin1");
      expect(result.summary.deleted).toBe(1);
    });
  });

  describe("modified plugins", () => {
    it("should detect enabled flag change", () => {
      const local = makeConfig([makePlugin({ enabled: false })]);
      const remote = makeConfig([makePlugin({ enabled: true })]);
      const result = PluginDiffDetector.detect(local, remote);
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].type).toBe("modified");
      expect(result.entries[0].details).toContain("enabled");
    });

    it("should detect name change", () => {
      const local = makeConfig([makePlugin({ name: "New Name" })]);
      const remote = makeConfig([makePlugin({ name: "Old Name" })]);
      const result = PluginDiffDetector.detect(local, remote);
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].type).toBe("modified");
      expect(result.entries[0].details).toContain("name");
    });
  });

  describe("multiple changes", () => {
    it("should detect added, modified, and deleted simultaneously", () => {
      const local = makeConfig([
        makePlugin({ id: "p1", enabled: false }),
        makePlugin({ id: "p_new" }),
      ]);
      const remote = makeConfig([
        makePlugin({ id: "p1", enabled: true }),
        makePlugin({ id: "p_old" }),
      ]);
      const result = PluginDiffDetector.detect(local, remote);
      expect(result.summary.added).toBe(1);
      expect(result.summary.modified).toBe(1);
      expect(result.summary.deleted).toBe(1);
      expect(result.summary.total).toBe(3);
    });
  });
});
