import { describe, expect, it } from "vitest";
import type { CustomizationConfig } from "../../entity";
import { ConfigParser } from "../configParser";
import { CustomizationConfigSerializer } from "../configSerializer";

describe("CustomizationConfigSerializer", () => {
  it("should serialize a config with desktop FILE resources", () => {
    const config: CustomizationConfig = {
      scope: "ALL",
      desktop: {
        js: [{ type: "FILE", path: "desktop/js/app.js" }],
        css: [{ type: "FILE", path: "desktop/css/style.css" }],
      },
      mobile: { js: [], css: [] },
    };

    const yaml = CustomizationConfigSerializer.serialize(config);
    const parsed = ConfigParser.parse(yaml);

    expect(parsed.scope).toBe("ALL");
    expect(parsed.desktop.js).toEqual([
      { type: "FILE", path: "desktop/js/app.js" },
    ]);
    expect(parsed.desktop.css).toEqual([
      { type: "FILE", path: "desktop/css/style.css" },
    ]);
    expect(parsed.mobile.js).toEqual([]);
    expect(parsed.mobile.css).toEqual([]);
  });

  it("should serialize a config with URL resources", () => {
    const config: CustomizationConfig = {
      scope: undefined,
      desktop: {
        js: [{ type: "URL", url: "https://example.com/script.js" }],
        css: [],
      },
      mobile: { js: [], css: [] },
    };

    const yaml = CustomizationConfigSerializer.serialize(config);
    const parsed = ConfigParser.parse(yaml);

    expect(parsed.scope).toBeUndefined();
    expect(parsed.desktop.js).toEqual([
      { type: "URL", url: "https://example.com/script.js" },
    ]);
  });

  it("should serialize a config with both desktop and mobile", () => {
    const config: CustomizationConfig = {
      scope: "ADMIN",
      desktop: {
        js: [{ type: "FILE", path: "desktop/js/app.js" }],
        css: [],
      },
      mobile: {
        js: [{ type: "FILE", path: "mobile/js/app.js" }],
        css: [],
      },
    };

    const yaml = CustomizationConfigSerializer.serialize(config);
    const parsed = ConfigParser.parse(yaml);

    expect(parsed.scope).toBe("ADMIN");
    expect(parsed.desktop.js).toEqual([
      { type: "FILE", path: "desktop/js/app.js" },
    ]);
    expect(parsed.mobile.js).toEqual([
      { type: "FILE", path: "mobile/js/app.js" },
    ]);
  });

  it("should serialize a config with mixed FILE and URL resources", () => {
    const config: CustomizationConfig = {
      scope: "ALL",
      desktop: {
        js: [
          { type: "FILE", path: "desktop/js/app.js" },
          { type: "URL", url: "https://cdn.example.com/lib.js" },
        ],
        css: [{ type: "URL", url: "https://cdn.example.com/style.css" }],
      },
      mobile: { js: [], css: [] },
    };

    const yaml = CustomizationConfigSerializer.serialize(config);
    const parsed = ConfigParser.parse(yaml);

    expect(parsed.desktop.js).toHaveLength(2);
    expect(parsed.desktop.js[0]).toEqual({
      type: "FILE",
      path: "desktop/js/app.js",
    });
    expect(parsed.desktop.js[1]).toEqual({
      type: "URL",
      url: "https://cdn.example.com/lib.js",
    });
    expect(parsed.desktop.css).toHaveLength(1);
  });

  it("should omit mobile section when mobile has no resources", () => {
    const config: CustomizationConfig = {
      scope: "ALL",
      desktop: {
        js: [{ type: "FILE", path: "desktop/js/app.js" }],
        css: [],
      },
      mobile: { js: [], css: [] },
    };

    const yaml = CustomizationConfigSerializer.serialize(config);
    expect(yaml).not.toContain("mobile");
  });

  it("should omit scope when undefined", () => {
    const config: CustomizationConfig = {
      scope: undefined,
      desktop: {
        js: [{ type: "FILE", path: "desktop/js/app.js" }],
        css: [],
      },
      mobile: { js: [], css: [] },
    };

    const yaml = CustomizationConfigSerializer.serialize(config);
    expect(yaml).not.toContain("scope");
  });

  it("should handle NONE scope", () => {
    const config: CustomizationConfig = {
      scope: "NONE",
      desktop: {
        js: [],
        css: [],
      },
      mobile: { js: [], css: [] },
    };

    const yaml = CustomizationConfigSerializer.serialize(config);
    const parsed = ConfigParser.parse(yaml);

    expect(parsed.scope).toBe("NONE");
  });

  it("should round-trip when both desktop and mobile are empty with scope", () => {
    const config: CustomizationConfig = {
      scope: "ALL",
      desktop: { js: [], css: [] },
      mobile: { js: [], css: [] },
    };

    const yaml = CustomizationConfigSerializer.serialize(config);
    const parsed = ConfigParser.parse(yaml);

    expect(parsed.scope).toBe("ALL");
    expect(parsed.desktop.js).toEqual([]);
    expect(parsed.desktop.css).toEqual([]);
    expect(parsed.mobile.js).toEqual([]);
    expect(parsed.mobile.css).toEqual([]);
  });

  it("should round-trip when both desktop and mobile are empty without scope", () => {
    const config: CustomizationConfig = {
      scope: undefined,
      desktop: { js: [], css: [] },
      mobile: { js: [], css: [] },
    };

    const yaml = CustomizationConfigSerializer.serialize(config);
    const parsed = ConfigParser.parse(yaml);

    expect(parsed.scope).toBeUndefined();
    expect(parsed.desktop.js).toEqual([]);
    expect(parsed.desktop.css).toEqual([]);
    expect(parsed.mobile.js).toEqual([]);
    expect(parsed.mobile.css).toEqual([]);
  });
});
