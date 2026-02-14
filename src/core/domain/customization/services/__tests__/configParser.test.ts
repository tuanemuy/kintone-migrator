import { describe, expect, it } from "vitest";
import { BusinessRuleError } from "@/core/domain/error";
import { CustomizationErrorCode } from "../../errorCode";
import { ConfigParser } from "../configParser";

describe("ConfigParser", () => {
  describe("parse", () => {
    it("全フィールドを含む有効な設定をパースできる", () => {
      const yaml = `
scope: ALL
desktop:
  js:
    - type: FILE
      path: ./dist/desktop.js
    - type: URL
      url: https://cdn.example.com/lib.js
  css:
    - type: FILE
      path: ./styles/desktop.css
mobile:
  js:
    - type: FILE
      path: ./dist/mobile.js
  css: []
`;
      const config = ConfigParser.parse(yaml);

      expect(config.scope).toBe("ALL");
      expect(config.desktop.js).toHaveLength(2);
      expect(config.desktop.js[0]).toEqual({
        type: "FILE",
        path: "./dist/desktop.js",
      });
      expect(config.desktop.js[1]).toEqual({
        type: "URL",
        url: "https://cdn.example.com/lib.js",
      });
      expect(config.desktop.css).toHaveLength(1);
      expect(config.desktop.css[0]).toEqual({
        type: "FILE",
        path: "./styles/desktop.css",
      });
      expect(config.mobile.js).toHaveLength(1);
      expect(config.mobile.js[0]).toEqual({
        type: "FILE",
        path: "./dist/mobile.js",
      });
      expect(config.mobile.css).toHaveLength(0);
    });

    it("scopeなしの設定をパースするとscopeがundefinedになる", () => {
      const yaml = `
desktop:
  js: []
  css: []
mobile:
  js: []
  css: []
`;
      const config = ConfigParser.parse(yaml);

      expect(config.scope).toBeUndefined();
    });

    it("ADMINスコープをパースできる", () => {
      const yaml = `
scope: ADMIN
desktop:
  js: []
  css: []
mobile:
  js: []
  css: []
`;
      const config = ConfigParser.parse(yaml);

      expect(config.scope).toBe("ADMIN");
    });

    it("NONEスコープをパースできる", () => {
      const yaml = `
scope: NONE
desktop:
  js: []
  css: []
mobile:
  js: []
  css: []
`;
      const config = ConfigParser.parse(yaml);

      expect(config.scope).toBe("NONE");
    });

    it("js/cssが省略された場合、空配列として扱う", () => {
      const yaml = `
desktop: {}
mobile: {}
`;
      const config = ConfigParser.parse(yaml);

      expect(config.desktop.js).toHaveLength(0);
      expect(config.desktop.css).toHaveLength(0);
      expect(config.mobile.js).toHaveLength(0);
      expect(config.mobile.css).toHaveLength(0);
    });

    it("空テキストの場合、EmptyConfigTextをスローする", () => {
      expect(() => ConfigParser.parse("")).toThrow(BusinessRuleError);
      expect(() => ConfigParser.parse("")).toThrow(
        expect.objectContaining({
          code: CustomizationErrorCode.CzEmptyConfigText,
        }),
      );
    });

    it("空白のみのテキストの場合、EmptyConfigTextをスローする", () => {
      expect(() => ConfigParser.parse("   \n  ")).toThrow(BusinessRuleError);
      expect(() => ConfigParser.parse("   \n  ")).toThrow(
        expect.objectContaining({
          code: CustomizationErrorCode.CzEmptyConfigText,
        }),
      );
    });

    it("不正なYAMLの場合、InvalidConfigYamlをスローする", () => {
      expect(() => ConfigParser.parse("{ invalid: yaml:")).toThrow(
        BusinessRuleError,
      );
      expect(() => ConfigParser.parse("{ invalid: yaml:")).toThrow(
        expect.objectContaining({
          code: CustomizationErrorCode.CzInvalidConfigYaml,
        }),
      );
    });

    it("YAMLがオブジェクトでない場合、InvalidConfigStructureをスローする", () => {
      expect(() => ConfigParser.parse("just a string")).toThrow(
        BusinessRuleError,
      );
      expect(() => ConfigParser.parse("just a string")).toThrow(
        expect.objectContaining({
          code: CustomizationErrorCode.CzInvalidConfigStructure,
        }),
      );
    });

    it("不正なスコープ値の場合、InvalidScopeをスローする", () => {
      const yaml = `
scope: INVALID
desktop:
  js: []
  css: []
mobile:
  js: []
  css: []
`;
      expect(() => ConfigParser.parse(yaml)).toThrow(BusinessRuleError);
      expect(() => ConfigParser.parse(yaml)).toThrow(
        expect.objectContaining({
          code: CustomizationErrorCode.CzInvalidScope,
        }),
      );
    });

    it("desktopが未定義の場合、InvalidConfigStructureをスローする", () => {
      const yaml = `
mobile:
  js: []
  css: []
`;
      expect(() => ConfigParser.parse(yaml)).toThrow(BusinessRuleError);
      expect(() => ConfigParser.parse(yaml)).toThrow(
        expect.objectContaining({
          code: CustomizationErrorCode.CzInvalidConfigStructure,
        }),
      );
    });

    it("mobileが未定義の場合、デフォルトの空プラットフォームが設定される", () => {
      const yaml = `
desktop:
  js: []
  css: []
`;
      const result = ConfigParser.parse(yaml);
      expect(result.mobile).toEqual({ js: [], css: [] });
    });

    it("不正なリソースタイプの場合、InvalidResourceTypeをスローする", () => {
      const yaml = `
desktop:
  js:
    - type: INVALID
      path: ./test.js
  css: []
mobile:
  js: []
  css: []
`;
      expect(() => ConfigParser.parse(yaml)).toThrow(BusinessRuleError);
      expect(() => ConfigParser.parse(yaml)).toThrow(
        expect.objectContaining({
          code: CustomizationErrorCode.CzInvalidResourceType,
        }),
      );
    });

    it("FILEリソースにpathがない場合、InvalidConfigStructureをスローする", () => {
      const yaml = `
desktop:
  js:
    - type: FILE
  css: []
mobile:
  js: []
  css: []
`;
      expect(() => ConfigParser.parse(yaml)).toThrow(BusinessRuleError);
      expect(() => ConfigParser.parse(yaml)).toThrow(
        expect.objectContaining({
          code: CustomizationErrorCode.CzInvalidConfigStructure,
        }),
      );
    });

    it("URLリソースにurlがない場合、InvalidConfigStructureをスローする", () => {
      const yaml = `
desktop:
  js:
    - type: URL
  css: []
mobile:
  js: []
  css: []
`;
      expect(() => ConfigParser.parse(yaml)).toThrow(BusinessRuleError);
      expect(() => ConfigParser.parse(yaml)).toThrow(
        expect.objectContaining({
          code: CustomizationErrorCode.CzInvalidConfigStructure,
        }),
      );
    });
  });
});
