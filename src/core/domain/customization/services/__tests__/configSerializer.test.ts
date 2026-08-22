import { describe, expect, it } from "vitest";
import type { CustomizationConfig } from "../../entity";
import { CustomizationConfigParser } from "../configParser";
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

    const result = CustomizationConfigSerializer.serialize(config);
    const parsed = CustomizationConfigParser.parse(result);

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

    const result = CustomizationConfigSerializer.serialize(config);
    const parsed = CustomizationConfigParser.parse(result);

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

    const result = CustomizationConfigSerializer.serialize(config);
    const parsed = CustomizationConfigParser.parse(result);

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

    const result = CustomizationConfigSerializer.serialize(config);
    const parsed = CustomizationConfigParser.parse(result);

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

    const result = CustomizationConfigSerializer.serialize(config);
    expect(result).not.toHaveProperty("mobile");
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

    const result = CustomizationConfigSerializer.serialize(config);
    expect(result).not.toHaveProperty("scope");
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

    const result = CustomizationConfigSerializer.serialize(config);
    const parsed = CustomizationConfigParser.parse(result);

    expect(parsed.scope).toBe("NONE");
  });

  it("should round-trip when both desktop and mobile are empty with scope", () => {
    const config: CustomizationConfig = {
      scope: "ALL",
      desktop: { js: [], css: [] },
      mobile: { js: [], css: [] },
    };

    const result = CustomizationConfigSerializer.serialize(config);
    const parsed = CustomizationConfigParser.parse(result);

    expect(parsed.scope).toBe("ALL");
    expect(parsed.desktop.js).toEqual([]);
    expect(parsed.desktop.css).toEqual([]);
    expect(parsed.mobile.js).toEqual([]);
    expect(parsed.mobile.css).toEqual([]);
  });

  it("should let a decorator contribute extra keys", () => {
    const config: CustomizationConfig = {
      scope: "ALL",
      desktop: {
        js: [{ type: "FILE", path: "desktop/js/app.js" }],
        css: [],
      },
      mobile: {
        js: [],
        css: [{ type: "URL", url: "https://cdn.example.com/style.css" }],
      },
    };

    const result = CustomizationConfigSerializer.serialize(
      config,
      (platform, category) => ({ marker: `${platform}:${category}` }),
    );

    expect(result).toEqual({
      scope: "ALL",
      desktop: {
        js: [{ type: "FILE", path: "desktop/js/app.js", marker: "desktop:js" }],
      },
      mobile: {
        css: [
          {
            type: "URL",
            url: "https://cdn.example.com/style.css",
            marker: "mobile:css",
          },
        ],
      },
    });
  });

  it("should keep the resource's own keys when a decorator returns them", () => {
    const config: CustomizationConfig = {
      scope: "ALL",
      desktop: {
        js: [{ type: "FILE", path: "desktop/js/app.js" }],
        css: [],
      },
      mobile: {
        js: [{ type: "URL", url: "https://cdn.example.com/lib.js" }],
        css: [],
      },
    };

    const result = CustomizationConfigSerializer.serialize(config, () => ({
      type: "URL",
      path: "hijacked.js",
      url: "https://evil.example.com/hijacked.js",
      digest: "extra",
    }));
    const parsed = CustomizationConfigParser.parse(result);

    expect(result.desktop).toMatchObject({
      js: [{ type: "FILE", path: "desktop/js/app.js" }],
    });
    expect(result.mobile).toMatchObject({
      js: [{ type: "URL", url: "https://cdn.example.com/lib.js" }],
    });
    expect(parsed.desktop.js).toEqual([
      { type: "FILE", path: "desktop/js/app.js" },
    ]);
    expect(parsed.mobile.js).toEqual([
      { type: "URL", url: "https://cdn.example.com/lib.js" },
    ]);
  });

  it("should round-trip when both desktop and mobile are empty without scope", () => {
    const config: CustomizationConfig = {
      scope: undefined,
      desktop: { js: [], css: [] },
      mobile: { js: [], css: [] },
    };

    const result = CustomizationConfigSerializer.serialize(config);
    const parsed = CustomizationConfigParser.parse(result);

    expect(parsed.scope).toBeUndefined();
    expect(parsed.desktop.js).toEqual([]);
    expect(parsed.desktop.css).toEqual([]);
    expect(parsed.mobile.js).toEqual([]);
    expect(parsed.mobile.css).toEqual([]);
  });
});
