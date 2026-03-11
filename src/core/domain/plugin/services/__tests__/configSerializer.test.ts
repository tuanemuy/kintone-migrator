import { describe, expect, it } from "vitest";
import type { PluginsConfig } from "../../entity";
import { PluginConfigParser } from "../configParser";
import { PluginConfigSerializer } from "../configSerializer";

describe("PluginConfigSerializer", () => {
  describe("serialize", () => {
    it("should serialize config with multiple plugins", () => {
      const config: PluginsConfig = {
        plugins: [
          {
            id: "djmhffjlbkikgmepoociabnpfcfjhdge",
            name: "条件分岐プラグイン",
            enabled: true,
          },
          {
            id: "abcdefghijklmnopqrstuvwxyz012345",
            name: "ルックアッププラグイン",
            enabled: false,
          },
        ],
      };

      const result = PluginConfigSerializer.serialize(config);
      const plugins = result.plugins as Record<string, unknown>[];

      expect(plugins).toHaveLength(2);
      expect(plugins[0].id).toBe("djmhffjlbkikgmepoociabnpfcfjhdge");
      expect(plugins[0].name).toBe("条件分岐プラグイン");
      expect(plugins[1].id).toBe("abcdefghijklmnopqrstuvwxyz012345");
      expect(plugins[1].name).toBe("ルックアッププラグイン");
    });

    it("should serialize config with empty name", () => {
      const config: PluginsConfig = {
        plugins: [
          {
            id: "djmhffjlbkikgmepoociabnpfcfjhdge",
            name: "",
            enabled: true,
          },
        ],
      };

      const result = PluginConfigSerializer.serialize(config);
      const plugins = result.plugins as Record<string, unknown>[];

      expect(plugins[0].id).toBe("djmhffjlbkikgmepoociabnpfcfjhdge");
    });

    it("should serialize config with empty plugins", () => {
      const config: PluginsConfig = {
        plugins: [],
      };

      const result = PluginConfigSerializer.serialize(config);

      expect(result.plugins).toEqual([]);
    });

    it("should roundtrip parse and serialize", () => {
      const input = {
        plugins: [
          {
            id: "djmhffjlbkikgmepoociabnpfcfjhdge",
            name: "条件分岐プラグイン",
          },
          {
            id: "abcdefghijklmnopqrstuvwxyz012345",
            name: "ルックアッププラグイン",
          },
        ],
      };
      const parsed = PluginConfigParser.parse(input);
      const serialized = PluginConfigSerializer.serialize(parsed);
      const reparsed = PluginConfigParser.parse(serialized);

      expect(reparsed).toEqual(parsed);
    });
  });
});
