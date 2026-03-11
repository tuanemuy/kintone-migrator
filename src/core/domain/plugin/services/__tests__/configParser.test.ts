import { describe, expect, it } from "vitest";
import { BusinessRuleError } from "@/core/domain/error";
import { PluginErrorCode } from "../../errorCode";
import { PluginConfigParser } from "../configParser";

describe("PluginConfigParser", () => {
  describe("parse", () => {
    it("should parse a valid config with multiple plugins", () => {
      const config = PluginConfigParser.parse({
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
      });

      expect(config.plugins).toHaveLength(2);
      expect(config.plugins[0]).toEqual({
        id: "djmhffjlbkikgmepoociabnpfcfjhdge",
        name: "条件分岐プラグイン",
        enabled: true,
      });
      expect(config.plugins[1]).toEqual({
        id: "abcdefghijklmnopqrstuvwxyz012345",
        name: "ルックアッププラグイン",
        enabled: true,
      });
    });

    it("should parse config with name defaulting to empty string when missing", () => {
      const config = PluginConfigParser.parse({
        plugins: [{ id: "djmhffjlbkikgmepoociabnpfcfjhdge" }],
      });

      expect(config.plugins).toHaveLength(1);
      expect(config.plugins[0].id).toBe("djmhffjlbkikgmepoociabnpfcfjhdge");
      expect(config.plugins[0].name).toBe("");
    });

    it("should parse config with empty plugins array", () => {
      const config = PluginConfigParser.parse({
        plugins: [],
      });

      expect(config.plugins).toHaveLength(0);
    });

    it("should throw PlInvalidConfigStructure for non-object input", () => {
      expect(() => PluginConfigParser.parse("just a string")).toThrow(
        BusinessRuleError,
      );
      expect(() => PluginConfigParser.parse("just a string")).toThrow(
        expect.objectContaining({
          code: PluginErrorCode.PlInvalidConfigStructure,
        }),
      );
    });

    it("should throw PlInvalidConfigStructure for array input", () => {
      expect(() => PluginConfigParser.parse(["item1"])).toThrow(
        BusinessRuleError,
      );
      expect(() => PluginConfigParser.parse(["item1"])).toThrow(
        expect.objectContaining({
          code: PluginErrorCode.PlInvalidConfigStructure,
        }),
      );
    });

    it("should throw PlInvalidConfigStructure for null input", () => {
      expect(() => PluginConfigParser.parse(null)).toThrow(BusinessRuleError);
      expect(() => PluginConfigParser.parse(null)).toThrow(
        expect.objectContaining({
          code: PluginErrorCode.PlInvalidConfigStructure,
        }),
      );
    });

    it("should throw PlInvalidConfigStructure when plugins key is missing", () => {
      expect(() => PluginConfigParser.parse({ someOtherKey: "value" })).toThrow(
        BusinessRuleError,
      );
      expect(() => PluginConfigParser.parse({ someOtherKey: "value" })).toThrow(
        expect.objectContaining({
          code: PluginErrorCode.PlInvalidConfigStructure,
        }),
      );
    });

    it("should throw PlInvalidConfigStructure when plugins is not an array", () => {
      expect(() =>
        PluginConfigParser.parse({ plugins: "not_an_array" }),
      ).toThrow(BusinessRuleError);
      expect(() =>
        PluginConfigParser.parse({ plugins: "not_an_array" }),
      ).toThrow(
        expect.objectContaining({
          code: PluginErrorCode.PlInvalidConfigStructure,
        }),
      );
    });

    it("should throw PlInvalidConfigStructure for non-object plugin entry", () => {
      expect(() =>
        PluginConfigParser.parse({ plugins: ["just a string"] }),
      ).toThrow(BusinessRuleError);
      expect(() =>
        PluginConfigParser.parse({ plugins: ["just a string"] }),
      ).toThrow(
        expect.objectContaining({
          code: PluginErrorCode.PlInvalidConfigStructure,
        }),
      );
    });

    it("should throw PlEmptyPluginId for empty plugin id", () => {
      expect(() =>
        PluginConfigParser.parse({
          plugins: [{ id: "", name: "test" }],
        }),
      ).toThrow(BusinessRuleError);
      expect(() =>
        PluginConfigParser.parse({
          plugins: [{ id: "", name: "test" }],
        }),
      ).toThrow(
        expect.objectContaining({
          code: PluginErrorCode.PlEmptyPluginId,
        }),
      );
    });

    it("should throw PlEmptyPluginId for missing plugin id", () => {
      expect(() =>
        PluginConfigParser.parse({
          plugins: [{ name: "test" }],
        }),
      ).toThrow(BusinessRuleError);
      expect(() =>
        PluginConfigParser.parse({
          plugins: [{ name: "test" }],
        }),
      ).toThrow(
        expect.objectContaining({
          code: PluginErrorCode.PlEmptyPluginId,
        }),
      );
    });

    it("should parse enabled: false", () => {
      const config = PluginConfigParser.parse({
        plugins: [
          {
            id: "djmhffjlbkikgmepoociabnpfcfjhdge",
            name: "テストプラグイン",
            enabled: false,
          },
        ],
      });
      expect(config.plugins[0].enabled).toBe(false);
    });

    it("should throw PlDuplicatePluginId for duplicate plugin IDs", () => {
      expect(() =>
        PluginConfigParser.parse({
          plugins: [
            {
              id: "djmhffjlbkikgmepoociabnpfcfjhdge",
              name: "プラグインA",
            },
            {
              id: "djmhffjlbkikgmepoociabnpfcfjhdge",
              name: "プラグインB",
            },
          ],
        }),
      ).toThrow(BusinessRuleError);
      expect(() =>
        PluginConfigParser.parse({
          plugins: [
            {
              id: "djmhffjlbkikgmepoociabnpfcfjhdge",
              name: "プラグインA",
            },
            {
              id: "djmhffjlbkikgmepoociabnpfcfjhdge",
              name: "プラグインB",
            },
          ],
        }),
      ).toThrow(
        expect.objectContaining({
          code: PluginErrorCode.PlDuplicatePluginId,
        }),
      );
    });

    it("should throw PlInvalidConfigStructure for string enabled value", () => {
      expect(() =>
        PluginConfigParser.parse({
          plugins: [
            {
              id: "djmhffjlbkikgmepoociabnpfcfjhdge",
              name: "テストプラグイン",
              enabled: "false",
            },
          ],
        }),
      ).toThrow(
        expect.objectContaining({
          code: PluginErrorCode.PlInvalidConfigStructure,
        }),
      );
    });

    it("should throw PlInvalidConfigStructure for numeric enabled value", () => {
      expect(() =>
        PluginConfigParser.parse({
          plugins: [
            {
              id: "djmhffjlbkikgmepoociabnpfcfjhdge",
              name: "テストプラグイン",
              enabled: 1,
            },
          ],
        }),
      ).toThrow(
        expect.objectContaining({
          code: PluginErrorCode.PlInvalidConfigStructure,
        }),
      );
    });
  });
});
