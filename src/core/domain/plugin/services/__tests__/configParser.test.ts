import { describe, expect, it } from "vitest";
import { BusinessRuleError } from "@/core/domain/error";
import { PluginErrorCode } from "../../errorCode";
import { PluginConfigParser } from "../configParser";

describe("PluginConfigParser", () => {
  describe("parse", () => {
    it("should parse a valid config with multiple plugins", () => {
      const yaml = `
plugins:
  - id: djmhffjlbkikgmepoociabnpfcfjhdge
    name: 条件分岐プラグイン
  - id: abcdefghijklmnopqrstuvwxyz012345
    name: ルックアッププラグイン
`;
      const config = PluginConfigParser.parse(yaml);

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
      const yaml = `
plugins:
  - id: djmhffjlbkikgmepoociabnpfcfjhdge
`;
      const config = PluginConfigParser.parse(yaml);

      expect(config.plugins).toHaveLength(1);
      expect(config.plugins[0].id).toBe("djmhffjlbkikgmepoociabnpfcfjhdge");
      expect(config.plugins[0].name).toBe("");
    });

    it("should parse config with empty plugins array", () => {
      const yaml = `
plugins: []
`;
      const config = PluginConfigParser.parse(yaml);

      expect(config.plugins).toHaveLength(0);
    });

    it("should throw PlEmptyConfigText for empty text", () => {
      expect(() => PluginConfigParser.parse("")).toThrow(BusinessRuleError);
      expect(() => PluginConfigParser.parse("")).toThrow(
        expect.objectContaining({
          code: PluginErrorCode.PlEmptyConfigText,
        }),
      );
    });

    it("should throw PlEmptyConfigText for whitespace-only text", () => {
      expect(() => PluginConfigParser.parse("   \n  ")).toThrow(
        BusinessRuleError,
      );
      expect(() => PluginConfigParser.parse("   \n  ")).toThrow(
        expect.objectContaining({
          code: PluginErrorCode.PlEmptyConfigText,
        }),
      );
    });

    it("should throw PlInvalidConfigYaml for invalid YAML", () => {
      expect(() => PluginConfigParser.parse("{ invalid: yaml:")).toThrow(
        BusinessRuleError,
      );
      expect(() => PluginConfigParser.parse("{ invalid: yaml:")).toThrow(
        expect.objectContaining({
          code: PluginErrorCode.PlInvalidConfigYaml,
        }),
      );
    });

    it("should throw PlInvalidConfigStructure for non-object YAML", () => {
      expect(() => PluginConfigParser.parse("just a string")).toThrow(
        BusinessRuleError,
      );
      expect(() => PluginConfigParser.parse("just a string")).toThrow(
        expect.objectContaining({
          code: PluginErrorCode.PlInvalidConfigStructure,
        }),
      );
    });

    it("should throw PlInvalidConfigStructure when plugins key is missing", () => {
      const yaml = `
someOtherKey: value
`;
      expect(() => PluginConfigParser.parse(yaml)).toThrow(BusinessRuleError);
      expect(() => PluginConfigParser.parse(yaml)).toThrow(
        expect.objectContaining({
          code: PluginErrorCode.PlInvalidConfigStructure,
        }),
      );
    });

    it("should throw PlInvalidConfigStructure when plugins is not an array", () => {
      const yaml = `
plugins: not_an_array
`;
      expect(() => PluginConfigParser.parse(yaml)).toThrow(BusinessRuleError);
      expect(() => PluginConfigParser.parse(yaml)).toThrow(
        expect.objectContaining({
          code: PluginErrorCode.PlInvalidConfigStructure,
        }),
      );
    });

    it("should throw PlInvalidConfigStructure for non-object plugin entry", () => {
      const yaml = `
plugins:
  - just a string
`;
      expect(() => PluginConfigParser.parse(yaml)).toThrow(BusinessRuleError);
      expect(() => PluginConfigParser.parse(yaml)).toThrow(
        expect.objectContaining({
          code: PluginErrorCode.PlInvalidConfigStructure,
        }),
      );
    });

    it("should throw PlEmptyPluginId for empty plugin id", () => {
      const yaml = `
plugins:
  - id: ""
    name: test
`;
      expect(() => PluginConfigParser.parse(yaml)).toThrow(BusinessRuleError);
      expect(() => PluginConfigParser.parse(yaml)).toThrow(
        expect.objectContaining({
          code: PluginErrorCode.PlEmptyPluginId,
        }),
      );
    });

    it("should throw PlEmptyPluginId for missing plugin id", () => {
      const yaml = `
plugins:
  - name: test
`;
      expect(() => PluginConfigParser.parse(yaml)).toThrow(BusinessRuleError);
      expect(() => PluginConfigParser.parse(yaml)).toThrow(
        expect.objectContaining({
          code: PluginErrorCode.PlEmptyPluginId,
        }),
      );
    });
  });
});
