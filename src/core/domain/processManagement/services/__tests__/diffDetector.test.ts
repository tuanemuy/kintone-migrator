import { describe, expect, it } from "vitest";
import type { ProcessManagementConfig, ProcessState } from "../../entity";
import type { ProcessAction } from "../../valueObject";
import { ProcessManagementDiffDetector } from "../diffDetector";

function makeState(overrides: Partial<ProcessState> = {}): ProcessState {
  return {
    index: 0,
    assignee: {
      type: "ONE",
      entities: [{ type: "USER", code: "user1" }],
    },
    ...overrides,
  };
}

function makeAction(overrides: Partial<ProcessAction> = {}): ProcessAction {
  return {
    name: "承認",
    from: "未処理",
    to: "処理中",
    filterCond: "",
    type: "PRIMARY",
    ...overrides,
  };
}

function makeConfig(
  overrides: Partial<ProcessManagementConfig> = {},
): ProcessManagementConfig {
  return {
    enable: true,
    states: {},
    actions: [],
    ...overrides,
  };
}

describe("ProcessManagementDiffDetector", () => {
  describe("no changes", () => {
    it("should return empty diff when configs are identical", () => {
      const config = makeConfig({
        states: { 未処理: makeState() },
        actions: [makeAction()],
      });

      const result = ProcessManagementDiffDetector.detect(config, config);

      expect(result.isEmpty).toBe(true);
      expect(result.entries).toHaveLength(0);
      expect(result.summary.total).toBe(0);
    });

    it("should return empty diff when both are empty", () => {
      const config = makeConfig();
      const result = ProcessManagementDiffDetector.detect(config, config);
      expect(result.isEmpty).toBe(true);
    });
  });

  describe("enable flag", () => {
    it("should detect enable flag change", () => {
      const local = makeConfig({ enable: true });
      const remote = makeConfig({ enable: false });

      const result = ProcessManagementDiffDetector.detect(local, remote);

      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].type).toBe("modified");
      expect(result.entries[0].category).toBe("enable");
      expect(result.entries[0].details).toBe("false -> true");
      expect(result.summary.modified).toBe(1);
    });
  });

  describe("states", () => {
    it("should detect added states", () => {
      const local = makeConfig({
        states: { 未処理: makeState() },
      });
      const remote = makeConfig();

      const result = ProcessManagementDiffDetector.detect(local, remote);

      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].type).toBe("added");
      expect(result.entries[0].category).toBe("state");
      expect(result.entries[0].name).toBe("未処理");
      expect(result.summary.added).toBe(1);
    });

    it("should detect deleted states", () => {
      const local = makeConfig();
      const remote = makeConfig({
        states: { 未処理: makeState() },
      });

      const result = ProcessManagementDiffDetector.detect(local, remote);

      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].type).toBe("deleted");
      expect(result.entries[0].category).toBe("state");
      expect(result.entries[0].name).toBe("未処理");
      expect(result.summary.deleted).toBe(1);
    });

    it("should detect state index change", () => {
      const local = makeConfig({
        states: { 未処理: makeState({ index: 1 }) },
      });
      const remote = makeConfig({
        states: { 未処理: makeState({ index: 0 }) },
      });

      const result = ProcessManagementDiffDetector.detect(local, remote);

      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].type).toBe("modified");
      expect(result.entries[0].details).toContain("index");
    });

    it("should detect assignee type change", () => {
      const local = makeConfig({
        states: {
          未処理: makeState({
            assignee: {
              type: "ALL",
              entities: [{ type: "USER", code: "user1" }],
            },
          }),
        },
      });
      const remote = makeConfig({
        states: {
          未処理: makeState({
            assignee: {
              type: "ONE",
              entities: [{ type: "USER", code: "user1" }],
            },
          }),
        },
      });

      const result = ProcessManagementDiffDetector.detect(local, remote);

      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].details).toContain("assignee.type");
    });

    it("should detect assignee entities change", () => {
      const local = makeConfig({
        states: {
          未処理: makeState({
            assignee: {
              type: "ONE",
              entities: [{ type: "GROUP", code: "group1" }],
            },
          }),
        },
      });
      const remote = makeConfig({
        states: {
          未処理: makeState({
            assignee: {
              type: "ONE",
              entities: [{ type: "USER", code: "user1" }],
            },
          }),
        },
      });

      const result = ProcessManagementDiffDetector.detect(local, remote);

      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].details).toContain("assignee.entities changed");
    });

    it("should detect entities change when entity count differs", () => {
      const local = makeConfig({
        states: {
          未処理: makeState({
            assignee: {
              type: "ONE",
              entities: [
                { type: "USER", code: "user1" },
                { type: "USER", code: "user2" },
              ],
            },
          }),
        },
      });
      const remote = makeConfig({
        states: {
          未処理: makeState({
            assignee: {
              type: "ONE",
              entities: [{ type: "USER", code: "user1" }],
            },
          }),
        },
      });

      const result = ProcessManagementDiffDetector.detect(local, remote);

      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].details).toContain("assignee.entities changed");
    });

    it("should detect entities change when includeSubs differs", () => {
      const local = makeConfig({
        states: {
          未処理: makeState({
            assignee: {
              type: "ONE",
              entities: [
                { type: "ORGANIZATION", code: "org1", includeSubs: true },
              ],
            },
          }),
        },
      });
      const remote = makeConfig({
        states: {
          未処理: makeState({
            assignee: {
              type: "ONE",
              entities: [
                { type: "ORGANIZATION", code: "org1", includeSubs: false },
              ],
            },
          }),
        },
      });

      const result = ProcessManagementDiffDetector.detect(local, remote);

      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].details).toContain("assignee.entities changed");
    });
  });

  describe("actions", () => {
    it("should detect added actions", () => {
      const local = makeConfig({
        actions: [makeAction()],
      });
      const remote = makeConfig();

      const result = ProcessManagementDiffDetector.detect(local, remote);

      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].type).toBe("added");
      expect(result.entries[0].category).toBe("action");
      expect(result.entries[0].name).toBe("承認");
      expect(result.entries[0].details).toBe("未処理 -> 処理中");
    });

    it("should detect deleted actions", () => {
      const local = makeConfig();
      const remote = makeConfig({
        actions: [makeAction()],
      });

      const result = ProcessManagementDiffDetector.detect(local, remote);

      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].type).toBe("deleted");
      expect(result.entries[0].category).toBe("action");
      expect(result.entries[0].name).toBe("承認");
    });

    it("should detect action from change", () => {
      const local = makeConfig({
        actions: [makeAction({ from: "処理中" })],
      });
      const remote = makeConfig({
        actions: [makeAction({ from: "未処理" })],
      });

      const result = ProcessManagementDiffDetector.detect(local, remote);

      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].type).toBe("modified");
      expect(result.entries[0].details).toContain("from");
    });

    it("should detect action to change", () => {
      const local = makeConfig({
        actions: [makeAction({ to: "完了" })],
      });
      const remote = makeConfig({
        actions: [makeAction({ to: "処理中" })],
      });

      const result = ProcessManagementDiffDetector.detect(local, remote);

      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].details).toContain("to");
    });

    it("should detect action filterCond change", () => {
      const local = makeConfig({
        actions: [makeAction({ filterCond: 'status = "active"' })],
      });
      const remote = makeConfig({
        actions: [makeAction({ filterCond: "" })],
      });

      const result = ProcessManagementDiffDetector.detect(local, remote);

      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].details).toContain("filterCond");
    });

    it("should detect action type change", () => {
      const local = makeConfig({
        actions: [makeAction({ type: "SECONDARY" })],
      });
      const remote = makeConfig({
        actions: [makeAction({ type: "PRIMARY" })],
      });

      const result = ProcessManagementDiffDetector.detect(local, remote);

      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].details).toContain("type");
    });

    it("should detect executableUser change", () => {
      const local = makeConfig({
        actions: [
          makeAction({
            executableUser: {
              entities: [{ type: "USER", code: "admin" }],
            },
          }),
        ],
      });
      const remote = makeConfig({
        actions: [
          makeAction({
            executableUser: {
              entities: [{ type: "USER", code: "user1" }],
            },
          }),
        ],
      });

      const result = ProcessManagementDiffDetector.detect(local, remote);

      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].details).toContain("executableUser changed");
    });

    it("should detect executableUser change when one is undefined", () => {
      const local = makeConfig({
        actions: [makeAction({ executableUser: undefined })],
      });
      const remote = makeConfig({
        actions: [
          makeAction({
            executableUser: {
              entities: [{ type: "USER", code: "user1" }],
            },
          }),
        ],
      });

      const result = ProcessManagementDiffDetector.detect(local, remote);

      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].details).toContain("executableUser changed");
    });
  });

  describe("multiple changes", () => {
    it("should detect added, modified, and deleted simultaneously", () => {
      const local = makeConfig({
        enable: false,
        states: {
          未処理: makeState(),
          新規: makeState({ index: 2 }),
        },
        actions: [makeAction()],
      });
      const remote = makeConfig({
        enable: true,
        states: {
          未処理: makeState(),
          削除済: makeState({ index: 3 }),
        },
        actions: [],
      });

      const result = ProcessManagementDiffDetector.detect(local, remote);

      expect(result.summary.added).toBeGreaterThanOrEqual(1);
      expect(result.summary.modified).toBeGreaterThanOrEqual(1);
      expect(result.summary.deleted).toBeGreaterThanOrEqual(1);
      expect(result.summary.total).toBe(
        result.summary.added + result.summary.modified + result.summary.deleted,
      );
      expect(result.isEmpty).toBe(false);
    });
  });
});
