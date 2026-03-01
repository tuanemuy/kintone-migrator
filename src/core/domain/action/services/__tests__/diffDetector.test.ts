import { describe, expect, it } from "vitest";
import type { ActionConfig, ActionsConfig } from "../../entity";
import { ActionDiffDetector } from "../diffDetector";

function makeAction(overrides: Partial<ActionConfig> = {}): ActionConfig {
  return {
    index: 0,
    name: "action1",
    destApp: { app: "1" },
    mappings: [],
    entities: [],
    filterCond: "",
    ...overrides,
  };
}

function makeConfig(actions: Record<string, ActionConfig> = {}): ActionsConfig {
  return { actions };
}

describe("ActionDiffDetector", () => {
  describe("no changes", () => {
    it("should return empty diff when actions are identical", () => {
      const local = makeConfig({ a: makeAction() });
      const remote = makeConfig({ a: makeAction() });
      const result = ActionDiffDetector.detect(local, remote);
      expect(result.isEmpty).toBe(true);
      expect(result.entries).toHaveLength(0);
      expect(result.summary.total).toBe(0);
    });

    it("should return empty diff when both are empty", () => {
      const result = ActionDiffDetector.detect(makeConfig(), makeConfig());
      expect(result.isEmpty).toBe(true);
    });
  });

  describe("added actions", () => {
    it("should detect added action", () => {
      const local = makeConfig({ a: makeAction() });
      const result = ActionDiffDetector.detect(local, makeConfig());
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].type).toBe("added");
      expect(result.entries[0].actionName).toBe("a");
      expect(result.summary.added).toBe(1);
    });
  });

  describe("deleted actions", () => {
    it("should detect deleted action", () => {
      const remote = makeConfig({ a: makeAction() });
      const result = ActionDiffDetector.detect(makeConfig(), remote);
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].type).toBe("deleted");
      expect(result.entries[0].actionName).toBe("a");
      expect(result.summary.deleted).toBe(1);
    });
  });

  describe("modified actions", () => {
    it("should detect index change", () => {
      const local = makeConfig({ a: makeAction({ index: 1 }) });
      const remote = makeConfig({ a: makeAction({ index: 0 }) });
      const result = ActionDiffDetector.detect(local, remote);
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].type).toBe("modified");
      expect(result.entries[0].details).toContain("index");
    });

    it("should detect name change", () => {
      const local = makeConfig({ a: makeAction({ name: "new" }) });
      const remote = makeConfig({ a: makeAction({ name: "old" }) });
      const result = ActionDiffDetector.detect(local, remote);
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].details).toContain("name");
    });

    it("should detect destApp change", () => {
      const local = makeConfig({ a: makeAction({ destApp: { app: "2" } }) });
      const remote = makeConfig({ a: makeAction({ destApp: { app: "1" } }) });
      const result = ActionDiffDetector.detect(local, remote);
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].details).toContain("destApp");
    });

    it("should detect filterCond change", () => {
      const local = makeConfig({
        a: makeAction({ filterCond: "field = 1" }),
      });
      const remote = makeConfig({ a: makeAction({ filterCond: "" }) });
      const result = ActionDiffDetector.detect(local, remote);
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].details).toContain("filterCond");
    });

    it("should detect mappings change", () => {
      const local = makeConfig({
        a: makeAction({
          mappings: [{ srcType: "FIELD", srcField: "f1", destField: "f2" }],
        }),
      });
      const remote = makeConfig({ a: makeAction({ mappings: [] }) });
      const result = ActionDiffDetector.detect(local, remote);
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].details).toContain("mappings");
    });

    it("should detect entities change", () => {
      const local = makeConfig({
        a: makeAction({
          entities: [{ type: "USER", code: "user1" }],
        }),
      });
      const remote = makeConfig({ a: makeAction({ entities: [] }) });
      const result = ActionDiffDetector.detect(local, remote);
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].details).toContain("entities");
    });
  });

  describe("multiple changes", () => {
    it("should detect added, modified, and deleted simultaneously", () => {
      const local = makeConfig({
        existing: makeAction({ index: 1 }),
        new_action: makeAction({ name: "new" }),
      });
      const remote = makeConfig({
        existing: makeAction({ index: 0 }),
        old_action: makeAction({ name: "old" }),
      });
      const result = ActionDiffDetector.detect(local, remote);
      expect(result.summary.added).toBe(1);
      expect(result.summary.modified).toBe(1);
      expect(result.summary.deleted).toBe(1);
      expect(result.summary.total).toBe(3);
      expect(result.isEmpty).toBe(false);
    });
  });
});
