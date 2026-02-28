import { describe, expect, it } from "vitest";
import type { CustomizationConfig } from "../../entity";
import type { RemotePlatform } from "../../valueObject";
import { CustomizationDiffDetector } from "../diffDetector";

function makeLocalConfig(
  overrides: Partial<CustomizationConfig> = {},
): CustomizationConfig {
  return {
    scope: "ALL",
    desktop: { js: [], css: [] },
    mobile: { js: [], css: [] },
    ...overrides,
  };
}

function makeRemotePlatform(
  overrides: Partial<RemotePlatform> = {},
): RemotePlatform {
  return {
    js: [],
    css: [],
    ...overrides,
  };
}

describe("CustomizationDiffDetector", () => {
  describe("no changes", () => {
    it("should return empty diff when configs are identical", () => {
      const result = CustomizationDiffDetector.detect(makeLocalConfig(), {
        scope: "ALL",
        desktop: makeRemotePlatform(),
        mobile: makeRemotePlatform(),
      });
      expect(result.isEmpty).toBe(true);
      expect(result.entries).toHaveLength(0);
    });
  });

  describe("scope changes", () => {
    it("should detect scope change", () => {
      const result = CustomizationDiffDetector.detect(
        makeLocalConfig({ scope: "ADMIN" }),
        {
          scope: "ALL",
          desktop: makeRemotePlatform(),
          mobile: makeRemotePlatform(),
        },
      );
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].type).toBe("modified");
      expect(result.entries[0].platform).toBe("config");
      expect(result.entries[0].resourceType).toBe("scope");
      expect(result.entries[0].details).toContain("ALL");
      expect(result.entries[0].details).toContain("ADMIN");
    });
  });

  describe("resource changes", () => {
    it("should detect added desktop JS resource", () => {
      const local = makeLocalConfig({
        desktop: {
          js: [{ type: "URL", url: "https://example.com/app.js" }],
          css: [],
        },
      });
      const result = CustomizationDiffDetector.detect(local, {
        scope: "ALL",
        desktop: makeRemotePlatform(),
        mobile: makeRemotePlatform(),
      });
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].type).toBe("added");
      expect(result.entries[0].platform).toBe("desktop");
      expect(result.entries[0].resourceType).toBe("js");
    });

    it("should detect deleted mobile CSS resource", () => {
      const remoteMobile = makeRemotePlatform({
        css: [{ type: "URL", url: "https://example.com/style.css" }],
      });
      const result = CustomizationDiffDetector.detect(makeLocalConfig(), {
        scope: "ALL",
        desktop: makeRemotePlatform(),
        mobile: remoteMobile,
      });
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].type).toBe("deleted");
      expect(result.entries[0].platform).toBe("mobile");
      expect(result.entries[0].resourceType).toBe("css");
    });

    it("should detect FILE resource by basename", () => {
      const local = makeLocalConfig({
        desktop: {
          js: [{ type: "FILE", path: "/path/to/app.js" }],
          css: [],
        },
      });
      const remoteDesktop = makeRemotePlatform({
        js: [
          {
            type: "FILE",
            file: {
              fileKey: "key1",
              name: "app.js",
              contentType: "application/javascript",
              size: "100",
            },
          },
        ],
      });
      const result = CustomizationDiffDetector.detect(local, {
        scope: "ALL",
        desktop: remoteDesktop,
        mobile: makeRemotePlatform(),
      });
      expect(result.isEmpty).toBe(true);
    });
  });

  describe("resource order changes", () => {
    it("should detect order change in desktop JS resources", () => {
      const local = makeLocalConfig({
        desktop: {
          js: [
            { type: "URL", url: "https://example.com/b.js" },
            { type: "URL", url: "https://example.com/a.js" },
          ],
          css: [],
        },
      });
      const remoteDesktop = makeRemotePlatform({
        js: [
          { type: "URL", url: "https://example.com/a.js" },
          { type: "URL", url: "https://example.com/b.js" },
        ],
      });
      const result = CustomizationDiffDetector.detect(local, {
        scope: "ALL",
        desktop: remoteDesktop,
        mobile: makeRemotePlatform(),
      });
      expect(result.entries.some((e) => e.type === "modified")).toBe(true);
      expect(result.entries.some((e) => e.details.includes("order"))).toBe(
        true,
      );
    });

    it("should not report order change with single resource", () => {
      const local = makeLocalConfig({
        desktop: {
          js: [{ type: "URL", url: "https://example.com/a.js" }],
          css: [],
        },
      });
      const remoteDesktop = makeRemotePlatform({
        js: [{ type: "URL", url: "https://example.com/a.js" }],
      });
      const result = CustomizationDiffDetector.detect(local, {
        scope: "ALL",
        desktop: remoteDesktop,
        mobile: makeRemotePlatform(),
      });
      expect(result.isEmpty).toBe(true);
    });
  });

  describe("multiple changes", () => {
    it("should detect changes across platforms", () => {
      const local = makeLocalConfig({
        scope: "ADMIN",
        desktop: {
          js: [{ type: "URL", url: "https://example.com/new.js" }],
          css: [],
        },
      });
      const remoteDesktop = makeRemotePlatform({
        js: [{ type: "URL", url: "https://example.com/old.js" }],
      });
      const result = CustomizationDiffDetector.detect(local, {
        scope: "ALL",
        desktop: remoteDesktop,
        mobile: makeRemotePlatform(),
      });
      expect(result.summary.total).toBeGreaterThanOrEqual(2);
      expect(result.isEmpty).toBe(false);
    });
  });
});
