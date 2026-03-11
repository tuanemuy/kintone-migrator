import { describe, expect, it } from "vitest";
import { BusinessRuleError } from "@/core/domain/error";
import { CustomizationErrorCode } from "../../errorCode";
import { CustomizationConfigParser } from "../configParser";

describe("CustomizationConfigParser", () => {
  describe("parse", () => {
    it("全フィールドを含む有効な設定をパースできる", () => {
      const config = CustomizationConfigParser.parse({
        scope: "ALL",
        desktop: {
          js: [
            { type: "FILE", path: "./dist/desktop.js" },
            { type: "URL", url: "https://cdn.example.com/lib.js" },
          ],
          css: [{ type: "FILE", path: "./styles/desktop.css" }],
        },
        mobile: {
          js: [{ type: "FILE", path: "./dist/mobile.js" }],
          css: [],
        },
      });

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
      const config = CustomizationConfigParser.parse({
        desktop: { js: [], css: [] },
        mobile: { js: [], css: [] },
      });

      expect(config.scope).toBeUndefined();
    });

    it("ADMINスコープをパースできる", () => {
      const config = CustomizationConfigParser.parse({
        scope: "ADMIN",
        desktop: { js: [], css: [] },
        mobile: { js: [], css: [] },
      });

      expect(config.scope).toBe("ADMIN");
    });

    it("NONEスコープをパースできる", () => {
      const config = CustomizationConfigParser.parse({
        scope: "NONE",
        desktop: { js: [], css: [] },
        mobile: { js: [], css: [] },
      });

      expect(config.scope).toBe("NONE");
    });

    it("js/cssが省略された場合、空配列として扱う", () => {
      const config = CustomizationConfigParser.parse({
        desktop: {},
        mobile: {},
      });

      expect(config.desktop.js).toHaveLength(0);
      expect(config.desktop.css).toHaveLength(0);
      expect(config.mobile.js).toHaveLength(0);
      expect(config.mobile.css).toHaveLength(0);
    });

    it("入力がオブジェクトでない場合、InvalidConfigStructureをスローする", () => {
      expect(() => CustomizationConfigParser.parse("just a string")).toThrow(
        BusinessRuleError,
      );
      expect(() => CustomizationConfigParser.parse("just a string")).toThrow(
        expect.objectContaining({
          code: CustomizationErrorCode.CzInvalidConfigStructure,
        }),
      );
    });

    it("配列の場合、InvalidConfigStructureをスローする", () => {
      expect(() => CustomizationConfigParser.parse(["item1"])).toThrow(
        BusinessRuleError,
      );
      expect(() => CustomizationConfigParser.parse(["item1"])).toThrow(
        expect.objectContaining({
          code: CustomizationErrorCode.CzInvalidConfigStructure,
        }),
      );
    });

    it("nullの場合、InvalidConfigStructureをスローする", () => {
      expect(() => CustomizationConfigParser.parse(null)).toThrow(
        BusinessRuleError,
      );
      expect(() => CustomizationConfigParser.parse(null)).toThrow(
        expect.objectContaining({
          code: CustomizationErrorCode.CzInvalidConfigStructure,
        }),
      );
    });

    it("不正なスコープ値の場合、InvalidScopeをスローする", () => {
      expect(() =>
        CustomizationConfigParser.parse({
          scope: "INVALID",
          desktop: { js: [], css: [] },
          mobile: { js: [], css: [] },
        }),
      ).toThrow(BusinessRuleError);
      expect(() =>
        CustomizationConfigParser.parse({
          scope: "INVALID",
          desktop: { js: [], css: [] },
          mobile: { js: [], css: [] },
        }),
      ).toThrow(
        expect.objectContaining({
          code: CustomizationErrorCode.CzInvalidScope,
        }),
      );
    });

    it("desktopが未定義の場合、空のdesktopとしてパースする", () => {
      const config = CustomizationConfigParser.parse({
        mobile: { js: [], css: [] },
      });
      expect(config.desktop.js).toEqual([]);
      expect(config.desktop.css).toEqual([]);
    });

    it("mobileが未定義の場合、デフォルトの空プラットフォームが設定される", () => {
      const result = CustomizationConfigParser.parse({
        desktop: { js: [], css: [] },
      });
      expect(result.mobile).toEqual({ js: [], css: [] });
    });

    it("不正なリソースタイプの場合、InvalidResourceTypeをスローする", () => {
      expect(() =>
        CustomizationConfigParser.parse({
          desktop: {
            js: [{ type: "INVALID", path: "./test.js" }],
            css: [],
          },
          mobile: { js: [], css: [] },
        }),
      ).toThrow(BusinessRuleError);
      expect(() =>
        CustomizationConfigParser.parse({
          desktop: {
            js: [{ type: "INVALID", path: "./test.js" }],
            css: [],
          },
          mobile: { js: [], css: [] },
        }),
      ).toThrow(
        expect.objectContaining({
          code: CustomizationErrorCode.CzInvalidResourceType,
        }),
      );
    });

    it("FILEリソースにpathがない場合、InvalidConfigStructureをスローする", () => {
      expect(() =>
        CustomizationConfigParser.parse({
          desktop: {
            js: [{ type: "FILE" }],
            css: [],
          },
          mobile: { js: [], css: [] },
        }),
      ).toThrow(BusinessRuleError);
      expect(() =>
        CustomizationConfigParser.parse({
          desktop: {
            js: [{ type: "FILE" }],
            css: [],
          },
          mobile: { js: [], css: [] },
        }),
      ).toThrow(
        expect.objectContaining({
          code: CustomizationErrorCode.CzInvalidConfigStructure,
        }),
      );
    });

    it("URLリソースにurlがない場合、InvalidConfigStructureをスローする", () => {
      expect(() =>
        CustomizationConfigParser.parse({
          desktop: {
            js: [{ type: "URL" }],
            css: [],
          },
          mobile: { js: [], css: [] },
        }),
      ).toThrow(BusinessRuleError);
      expect(() =>
        CustomizationConfigParser.parse({
          desktop: {
            js: [{ type: "URL" }],
            css: [],
          },
          mobile: { js: [], css: [] },
        }),
      ).toThrow(
        expect.objectContaining({
          code: CustomizationErrorCode.CzInvalidConfigStructure,
        }),
      );
    });
  });
});
