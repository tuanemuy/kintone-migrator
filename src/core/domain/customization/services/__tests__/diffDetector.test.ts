import { describe, expect, it } from "vitest";
import type { CustomizationConfig } from "../../entity";
import type { RemotePlatform } from "../../valueObject";
import { CustomizationDiffDetector } from "../diffDetector";

const EMPTY_MODIFIED: ReadonlySet<string> = new Set();

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
      const result = CustomizationDiffDetector.detect(
        makeLocalConfig(),
        {
          scope: "ALL",
          desktop: makeRemotePlatform(),
          mobile: makeRemotePlatform(),
        },
        EMPTY_MODIFIED,
      );
      expect(result.isEmpty).toBe(true);
      expect(result.entries).toHaveLength(0);
    });
  });

  describe("scope changes", () => {
    it("should treat undefined scope as ALL (no diff with remote ALL)", () => {
      const result = CustomizationDiffDetector.detect(
        makeLocalConfig({ scope: undefined }),
        {
          scope: "ALL",
          desktop: makeRemotePlatform(),
          mobile: makeRemotePlatform(),
        },
        EMPTY_MODIFIED,
      );
      expect(result.isEmpty).toBe(true);
      expect(
        result.entries.some(
          (e) => e.platform === "config" && e.category === "scope",
        ),
      ).toBe(false);
    });

    it("should detect scope change", () => {
      const result = CustomizationDiffDetector.detect(
        makeLocalConfig({ scope: "ADMIN" }),
        {
          scope: "ALL",
          desktop: makeRemotePlatform(),
          mobile: makeRemotePlatform(),
        },
        EMPTY_MODIFIED,
      );
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].type).toBe("modified");
      expect(result.entries[0].platform).toBe("config");
      expect(result.entries[0].category).toBe("scope");
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
      const result = CustomizationDiffDetector.detect(
        local,
        {
          scope: "ALL",
          desktop: makeRemotePlatform(),
          mobile: makeRemotePlatform(),
        },
        EMPTY_MODIFIED,
      );
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].type).toBe("added");
      expect(result.entries[0].platform).toBe("desktop");
      expect(result.entries[0].category).toBe("js");
      expect(result.entries[0].details).toBe("new URL resource");
    });

    it("should detect deleted mobile CSS resource", () => {
      const remoteMobile = makeRemotePlatform({
        css: [{ type: "URL", url: "https://example.com/style.css" }],
      });
      const result = CustomizationDiffDetector.detect(
        makeLocalConfig(),
        {
          scope: "ALL",
          desktop: makeRemotePlatform(),
          mobile: remoteMobile,
        },
        EMPTY_MODIFIED,
      );
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].type).toBe("deleted");
      expect(result.entries[0].platform).toBe("mobile");
      expect(result.entries[0].category).toBe("css");
      expect(result.entries[0].details).toBe("removed URL resource");
    });

    it("should detect FILE resource by basename with no content change", () => {
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
      const result = CustomizationDiffDetector.detect(
        local,
        {
          scope: "ALL",
          desktop: remoteDesktop,
          mobile: makeRemotePlatform(),
        },
        EMPTY_MODIFIED,
      );
      expect(result.isEmpty).toBe(true);
    });
  });

  describe("FILE content changes", () => {
    it("should report modified entry when file content has changed", () => {
      const local = makeLocalConfig({
        desktop: {
          js: [{ type: "FILE", path: "src/app.js" }],
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
      const modifiedFileNames = new Set(["app.js"]);
      const result = CustomizationDiffDetector.detect(
        local,
        {
          scope: "ALL",
          desktop: remoteDesktop,
          mobile: makeRemotePlatform(),
        },
        modifiedFileNames,
      );
      expect(result.isEmpty).toBe(false);
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].type).toBe("modified");
      expect(result.entries[0].platform).toBe("desktop");
      expect(result.entries[0].category).toBe("js");
      expect(result.entries[0].name).toBe("app.js");
      expect(result.entries[0].details).toBe("file content changed");
    });

    it("should not report modified entry when file content is unchanged", () => {
      const local = makeLocalConfig({
        desktop: {
          js: [{ type: "FILE", path: "src/app.js" }],
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
      const result = CustomizationDiffDetector.detect(
        local,
        {
          scope: "ALL",
          desktop: remoteDesktop,
          mobile: makeRemotePlatform(),
        },
        EMPTY_MODIFIED,
      );
      expect(result.isEmpty).toBe(true);
      expect(result.entries).toHaveLength(0);
    });

    it("should not report modified for URL resources even if name is in modifiedFileNames", () => {
      const local = makeLocalConfig({
        desktop: {
          js: [{ type: "URL", url: "https://example.com/app.js" }],
          css: [],
        },
      });
      const remoteDesktop = makeRemotePlatform({
        js: [{ type: "URL", url: "https://example.com/app.js" }],
      });
      const modifiedFileNames = new Set(["https://example.com/app.js"]);
      const result = CustomizationDiffDetector.detect(
        local,
        {
          scope: "ALL",
          desktop: remoteDesktop,
          mobile: makeRemotePlatform(),
        },
        modifiedFileNames,
      );
      expect(result.isEmpty).toBe(true);
    });

    it("should not report modified when local is FILE but remote is URL", () => {
      const local = makeLocalConfig({
        desktop: {
          js: [{ type: "FILE", path: "src/app.js" }],
          css: [],
        },
      });
      // Remote has a URL with the same basename "app.js" — this would be
      // treated as an add + delete rather than a match, so no content comparison.
      const remoteDesktop = makeRemotePlatform({
        js: [{ type: "URL", url: "app.js" }],
      });
      const modifiedFileNames = new Set(["app.js"]);
      const result = CustomizationDiffDetector.detect(
        local,
        {
          scope: "ALL",
          desktop: remoteDesktop,
          mobile: makeRemotePlatform(),
        },
        modifiedFileNames,
      );
      // Same basename but different resource types (local=FILE, remote=URL) are
      // treated as matched (no add/delete). Since remote is URL, no file content
      // comparison applies and no modified entry should be emitted.
      expect(
        result.entries.some((e) => e.details === "file content changed"),
      ).toBe(false);
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
      const result = CustomizationDiffDetector.detect(
        local,
        {
          scope: "ALL",
          desktop: remoteDesktop,
          mobile: makeRemotePlatform(),
        },
        EMPTY_MODIFIED,
      );
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
      const result = CustomizationDiffDetector.detect(
        local,
        {
          scope: "ALL",
          desktop: remoteDesktop,
          mobile: makeRemotePlatform(),
        },
        EMPTY_MODIFIED,
      );
      expect(result.isEmpty).toBe(true);
    });
  });

  describe("basename collision warning", () => {
    it("should emit warning when local FILE resources have duplicate basenames", () => {
      const local = makeLocalConfig({
        desktop: {
          js: [
            { type: "FILE", path: "src/app.js" },
            { type: "FILE", path: "lib/app.js" },
          ],
          css: [],
        },
      });
      const result = CustomizationDiffDetector.detect(
        local,
        {
          scope: "ALL",
          desktop: makeRemotePlatform(),
          mobile: makeRemotePlatform(),
        },
        EMPTY_MODIFIED,
      );
      expect(
        result.warnings.some((w) => w.includes("duplicate basenames")),
      ).toBe(true);
      // Warning should NOT appear in entries
      expect(result.entries.some((e) => e.name === "(warning)")).toBe(false);
      // Warning should NOT be counted in summary.modified
      expect(result.summary.modified).toBe(0);
    });

    it("should not emit spurious order entry when duplicates exist", () => {
      const local = makeLocalConfig({
        desktop: {
          js: [
            { type: "FILE", path: "src/app.js" },
            { type: "FILE", path: "lib/app.js" },
          ],
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
      const result = CustomizationDiffDetector.detect(
        local,
        {
          scope: "ALL",
          desktop: remoteDesktop,
          mobile: makeRemotePlatform(),
        },
        EMPTY_MODIFIED,
      );
      expect(result.entries.some((e) => e.name === "(order)")).toBe(false);
    });

    it("should not emit spurious warning when basenames are unique", () => {
      const local = makeLocalConfig({
        desktop: {
          js: [
            { type: "FILE", path: "src/app.js" },
            { type: "FILE", path: "src/util.js" },
          ],
          css: [],
        },
      });
      const result = CustomizationDiffDetector.detect(
        local,
        {
          scope: "ALL",
          desktop: makeRemotePlatform(),
          mobile: makeRemotePlatform(),
        },
        EMPTY_MODIFIED,
      );
      expect(result.warnings).toHaveLength(0);
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
      const result = CustomizationDiffDetector.detect(
        local,
        {
          scope: "ALL",
          desktop: remoteDesktop,
          mobile: makeRemotePlatform(),
        },
        EMPTY_MODIFIED,
      );
      expect(result.summary.total).toBe(3);
      expect(result.isEmpty).toBe(false);
    });
  });
});
