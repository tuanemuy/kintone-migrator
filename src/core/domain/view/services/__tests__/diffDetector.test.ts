import { describe, expect, it } from "vitest";
import type { ViewConfig } from "../../entity";
import { ViewDiffDetector } from "../diffDetector";

function makeView(
  overrides: Partial<ViewConfig> & { type: ViewConfig["type"] },
): ViewConfig {
  return {
    name: "test",
    index: 0,
    ...overrides,
  };
}

describe("ViewDiffDetector", () => {
  describe("no changes", () => {
    it("should return empty diff when views are identical", () => {
      const local: Record<string, ViewConfig> = {
        view1: makeView({ type: "LIST", name: "view1", fields: ["f1"] }),
      };
      const remote: Record<string, ViewConfig> = {
        view1: makeView({ type: "LIST", name: "view1", fields: ["f1"] }),
      };

      const result = ViewDiffDetector.detect(local, remote);

      expect(result.isEmpty).toBe(true);
      expect(result.entries).toHaveLength(0);
      expect(result.summary.total).toBe(0);
    });

    it("should return empty diff when both are empty", () => {
      const result = ViewDiffDetector.detect({}, {});
      expect(result.isEmpty).toBe(true);
    });
  });

  describe("added views", () => {
    it("should detect added views", () => {
      const local: Record<string, ViewConfig> = {
        view1: makeView({ type: "LIST", name: "view1" }),
      };

      const result = ViewDiffDetector.detect(local, {});

      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].type).toBe("added");
      expect(result.entries[0].viewName).toBe("view1");
      expect(result.summary.added).toBe(1);
    });
  });

  describe("deleted views", () => {
    it("should detect deleted views", () => {
      const remote: Record<string, ViewConfig> = {
        view1: makeView({ type: "LIST", name: "view1" }),
      };

      const result = ViewDiffDetector.detect({}, remote);

      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].type).toBe("deleted");
      expect(result.entries[0].viewName).toBe("view1");
      expect(result.summary.deleted).toBe(1);
    });
  });

  describe("modified views", () => {
    it("should detect type change", () => {
      const local: Record<string, ViewConfig> = {
        view1: makeView({ type: "CALENDAR", name: "view1" }),
      };
      const remote: Record<string, ViewConfig> = {
        view1: makeView({ type: "LIST", name: "view1" }),
      };

      const result = ViewDiffDetector.detect(local, remote);

      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].type).toBe("modified");
      expect(result.entries[0].details).toContain("type");
    });

    it("should detect index change", () => {
      const local: Record<string, ViewConfig> = {
        view1: makeView({ type: "LIST", name: "view1", index: 1 }),
      };
      const remote: Record<string, ViewConfig> = {
        view1: makeView({ type: "LIST", name: "view1", index: 0 }),
      };

      const result = ViewDiffDetector.detect(local, remote);

      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].type).toBe("modified");
      expect(result.entries[0].details).toContain("index");
    });

    it("should detect fields change", () => {
      const local: Record<string, ViewConfig> = {
        view1: makeView({ type: "LIST", name: "view1", fields: ["f1", "f2"] }),
      };
      const remote: Record<string, ViewConfig> = {
        view1: makeView({ type: "LIST", name: "view1", fields: ["f1"] }),
      };

      const result = ViewDiffDetector.detect(local, remote);

      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].details).toContain("fields changed");
    });

    it("should detect filterCond change", () => {
      const local: Record<string, ViewConfig> = {
        view1: makeView({ type: "LIST", name: "view1", filterCond: "a = b" }),
      };
      const remote: Record<string, ViewConfig> = {
        view1: makeView({ type: "LIST", name: "view1" }),
      };

      const result = ViewDiffDetector.detect(local, remote);

      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].details).toContain("filterCond changed");
    });

    it("should detect html change", () => {
      const local: Record<string, ViewConfig> = {
        view1: makeView({
          type: "CUSTOM",
          name: "view1",
          html: "<div>new</div>",
        }),
      };
      const remote: Record<string, ViewConfig> = {
        view1: makeView({
          type: "CUSTOM",
          name: "view1",
          html: "<div>old</div>",
        }),
      };

      const result = ViewDiffDetector.detect(local, remote);

      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].details).toContain("html changed");
    });

    it("should detect pager change", () => {
      const local: Record<string, ViewConfig> = {
        view1: makeView({ type: "CUSTOM", name: "view1", pager: true }),
      };
      const remote: Record<string, ViewConfig> = {
        view1: makeView({ type: "CUSTOM", name: "view1", pager: false }),
      };

      const result = ViewDiffDetector.detect(local, remote);

      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].details).toContain("pager");
    });
  });

  describe("multiple changes", () => {
    it("should detect added, modified, and deleted simultaneously", () => {
      const local: Record<string, ViewConfig> = {
        existing: makeView({ type: "LIST", name: "existing", index: 1 }),
        new_view: makeView({ type: "CALENDAR", name: "new_view" }),
      };
      const remote: Record<string, ViewConfig> = {
        existing: makeView({ type: "LIST", name: "existing", index: 0 }),
        old_view: makeView({ type: "CUSTOM", name: "old_view" }),
      };

      const result = ViewDiffDetector.detect(local, remote);

      expect(result.summary.added).toBe(1);
      expect(result.summary.modified).toBe(1);
      expect(result.summary.deleted).toBe(1);
      expect(result.summary.total).toBe(3);
      expect(result.isEmpty).toBe(false);
    });
  });
});
