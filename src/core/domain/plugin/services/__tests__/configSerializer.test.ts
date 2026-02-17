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

      const yaml = PluginConfigSerializer.serialize(config);

      expect(yaml).toContain("djmhffjlbkikgmepoociabnpfcfjhdge");
      expect(yaml).toContain("条件分岐プラグイン");
      expect(yaml).toContain("abcdefghijklmnopqrstuvwxyz012345");
      expect(yaml).toContain("ルックアッププラグイン");
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

      const yaml = PluginConfigSerializer.serialize(config);

      expect(yaml).toContain("djmhffjlbkikgmepoociabnpfcfjhdge");
    });

    it("should serialize config with empty plugins", () => {
      const config: PluginsConfig = {
        plugins: [],
      };

      const yaml = PluginConfigSerializer.serialize(config);

      expect(yaml).toContain("plugins: []");
    });

    it("should roundtrip parse and serialize", () => {
      const originalYaml = `
plugins:
  - id: djmhffjlbkikgmepoociabnpfcfjhdge
    name: 条件分岐プラグイン
  - id: abcdefghijklmnopqrstuvwxyz012345
    name: ルックアッププラグイン
`;
      const parsed = PluginConfigParser.parse(originalYaml);
      const serialized = PluginConfigSerializer.serialize(parsed);
      const reparsed = PluginConfigParser.parse(serialized);

      expect(reparsed).toEqual(parsed);
    });
  });
});
