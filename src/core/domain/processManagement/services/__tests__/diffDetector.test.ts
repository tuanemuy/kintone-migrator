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
    executableUser: {
      entities: [{ type: "USER", code: "user1" }],
    },
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
      expect(result.entries[0].details).toContain("assignee.entities:");
      expect(result.entries[0].details).toContain("->");
      expect(result.entries[0].details).toContain('"group1"');
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
      expect(result.entries[0].details).toContain("assignee.entities:");
    });

    it("should detect multiple state property changes simultaneously", () => {
      const local = makeConfig({
        states: {
          未処理: makeState({
            index: 5,
            assignee: {
              type: "ALL",
              entities: [{ type: "GROUP", code: "group1" }],
            },
          }),
        },
      });
      const remote = makeConfig({
        states: {
          未処理: makeState({
            index: 0,
            assignee: {
              type: "ONE",
              entities: [{ type: "USER", code: "user1" }],
            },
          }),
        },
      });

      const result = ProcessManagementDiffDetector.detect(local, remote);

      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].type).toBe("modified");
      expect(result.entries[0].details).toContain("index");
      expect(result.entries[0].details).toContain("assignee.type");
      expect(result.entries[0].details).toContain("assignee.entities:");
      expect(result.entries[0].details).toContain(
        "index: 0 -> 5\nassignee.type: ONE -> ALL\nassignee.entities:",
      );
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
      expect(result.entries[0].details).toContain("assignee.entities:");
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
      expect(result.entries[0].name).toBe("承認 (未処理 → 処理中)");
      expect(result.entries[0].details).toBe('filterCond: ""');
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
      expect(result.entries[0].name).toBe("承認 (未処理 → 処理中)");
      expect(result.entries[0].details).toBe('filterCond: ""');
    });

    it("should treat an action from change as delete and add", () => {
      const local = makeConfig({
        actions: [makeAction({ from: "処理中" })],
      });
      const remote = makeConfig({
        actions: [makeAction({ from: "未処理" })],
      });

      const result = ProcessManagementDiffDetector.detect(local, remote);

      expect(result.entries.map((e) => [e.type, e.name])).toEqual([
        ["added", "承認 (処理中 → 処理中)"],
        ["deleted", "承認 (未処理 → 処理中)"],
      ]);
    });

    it("should treat an action to change as delete and add", () => {
      const local = makeConfig({
        actions: [makeAction({ to: "完了" })],
      });
      const remote = makeConfig({
        actions: [makeAction({ to: "処理中" })],
      });

      const result = ProcessManagementDiffDetector.detect(local, remote);

      expect(result.entries.map((e) => [e.type, e.name])).toEqual([
        ["added", "承認 (未処理 → 完了)"],
        ["deleted", "承認 (未処理 → 処理中)"],
      ]);
    });

    it("should separate multiple action property changes by newline", () => {
      const local = makeConfig({
        actions: [makeAction({ filterCond: "金額 > 0", type: "SECONDARY" })],
      });
      const remote = makeConfig({
        actions: [makeAction({ filterCond: "", type: "PRIMARY" })],
      });

      const result = ProcessManagementDiffDetector.detect(local, remote);

      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].type).toBe("modified");
      expect(result.entries[0].name).toBe("承認 (未処理 → 処理中)");
      expect(result.entries[0].details).toBe(
        'filterCond: "" -> "金額 > 0"\ntype: PRIMARY -> SECONDARY',
      );
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
      expect(result.entries[0].details).toContain("executableUser:");
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
      expect(result.entries[0].details).toContain("executableUser:");
    });

    it("should detect executableUser change between undefined and empty entities", () => {
      const local = makeConfig({
        actions: [makeAction({ executableUser: undefined })],
      });
      const remote = makeConfig({
        actions: [makeAction({ executableUser: { entities: [] } })],
      });

      const result = ProcessManagementDiffDetector.detect(local, remote);

      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].details).toContain("executableUser:");
    });

    it("should report no change when both executableUser are undefined", () => {
      const local = makeConfig({
        actions: [makeAction({ executableUser: undefined })],
      });
      const remote = makeConfig({
        actions: [makeAction({ executableUser: undefined })],
      });

      const result = ProcessManagementDiffDetector.detect(local, remote);

      expect(result.isEmpty).toBe(true);
    });

    it("should report no change when executableUser entities are identical", () => {
      const config = makeConfig({
        actions: [
          makeAction({
            executableUser: {
              entities: [
                { type: "USER", code: "admin" },
                { type: "GROUP", code: "managers" },
              ],
            },
          }),
        ],
      });

      const result = ProcessManagementDiffDetector.detect(config, config);

      expect(result.isEmpty).toBe(true);
    });

    it("should treat same action name with different from/to as different actions", () => {
      const local = makeConfig({
        actions: [makeAction({ name: "移動", from: "state_A", to: "state_B" })],
      });
      const remote = makeConfig({
        actions: [makeAction({ name: "移動", from: "state_C", to: "state_D" })],
      });

      const result = ProcessManagementDiffDetector.detect(local, remote);

      expect(result.entries.map((e) => [e.type, e.category, e.name])).toEqual([
        ["added", "action", "移動 (state_A → state_B)"],
        ["deleted", "action", "移動 (state_C → state_D)"],
      ]);
    });

    it("should treat entities with undefined and missing code as equal", () => {
      const local = makeConfig({
        actions: [
          makeAction({
            executableUser: {
              entities: [{ type: "CREATOR" }],
            },
          }),
        ],
      });
      const remote = makeConfig({
        actions: [
          makeAction({
            executableUser: {
              entities: [{ type: "CREATOR" }],
            },
          }),
        ],
      });

      const result = ProcessManagementDiffDetector.detect(local, remote);

      expect(result.isEmpty).toBe(true);
    });
  });

  describe("same-named actions", () => {
    const sendBackFromFirst = makeAction({
      name: "差し戻し",
      from: "一次承認待ち",
      to: "未処理",
      executableUser: undefined,
    });
    const sendBackFromFinal = makeAction({
      name: "差し戻し",
      from: "最終承認待ち",
      to: "未処理",
      executableUser: undefined,
    });
    const applyToManager = makeAction({
      name: "申請する",
      from: "未処理",
      to: "課長承認待ち",
      filterCond: "金額 < 500000",
    });
    const applyToDirector = makeAction({
      name: "申請する",
      from: "未処理",
      to: "部長承認待ち",
      filterCond: "金額 >= 500000",
    });
    const approveSales = makeAction({
      name: "承認",
      from: "一次承認待ち",
      to: "最終承認待ち",
      filterCond: '部署 in ("営業")',
    });
    const approveDev = makeAction({
      name: "承認",
      from: "一次承認待ち",
      to: "最終承認待ち",
      filterCond: '部署 in ("開発")',
    });
    const allActions = [
      sendBackFromFirst,
      sendBackFromFinal,
      applyToManager,
      applyToDirector,
      approveSales,
      approveDev,
    ];

    it("should report no diff for identical configs with same-named actions", () => {
      const config = makeConfig({ actions: allActions });

      const result = ProcessManagementDiffDetector.detect(config, config);

      expect(result.isEmpty).toBe(true);
    });

    it("should report only the modified one of same-named actions from different states", () => {
      const local = makeConfig({
        actions: [
          sendBackFromFirst,
          { ...sendBackFromFinal, type: "SECONDARY" },
        ],
      });
      const remote = makeConfig({
        actions: [sendBackFromFirst, sendBackFromFinal],
      });

      const result = ProcessManagementDiffDetector.detect(local, remote);

      expect(result.entries).toEqual([
        {
          type: "modified",
          category: "action",
          name: "差し戻し (最終承認待ち → 未処理)",
          details: "type: PRIMARY -> SECONDARY",
        },
      ]);
    });

    it("should report only the modified branch of same-named actions from one state", () => {
      const local = makeConfig({
        actions: [
          applyToManager,
          { ...applyToDirector, filterCond: "金額 >= 1000000" },
        ],
      });
      const remote = makeConfig({
        actions: [applyToManager, applyToDirector],
      });

      const result = ProcessManagementDiffDetector.detect(local, remote);

      expect(result.entries).toEqual([
        {
          type: "modified",
          category: "action",
          name: "申請する (未処理 → 部長承認待ち)",
          details: 'filterCond: "金額 >= 500000" -> "金額 >= 1000000"',
        },
      ]);
    });

    it("should report only the added one of same-named actions", () => {
      const local = makeConfig({
        actions: [sendBackFromFirst, sendBackFromFinal],
      });
      const remote = makeConfig({ actions: [sendBackFromFirst] });

      const result = ProcessManagementDiffDetector.detect(local, remote);

      expect(result.entries).toEqual([
        {
          type: "added",
          category: "action",
          name: "差し戻し (最終承認待ち → 未処理)",
          details: 'filterCond: ""',
        },
      ]);
    });

    it("should report only the deleted one of same-named actions", () => {
      const local = makeConfig({ actions: [applyToDirector] });
      const remote = makeConfig({
        actions: [applyToManager, applyToDirector],
      });

      const result = ProcessManagementDiffDetector.detect(local, remote);

      expect(result.entries).toEqual([
        {
          type: "deleted",
          category: "action",
          name: "申請する (未処理 → 課長承認待ち)",
          details: 'filterCond: "金額 < 500000"',
        },
      ]);
    });

    it("should match actions sharing name, from, and to by occurrence order", () => {
      const local = makeConfig({
        actions: [approveSales, { ...approveDev, type: "SECONDARY" }],
      });
      const remote = makeConfig({ actions: [approveSales, approveDev] });

      const result = ProcessManagementDiffDetector.detect(local, remote);

      expect(result.entries).toEqual([
        {
          type: "modified",
          category: "action",
          name: "承認 (一次承認待ち → 最終承認待ち) #2",
          details: "type: PRIMARY -> SECONDARY",
        },
      ]);
    });

    it("should label added and deleted repeats of the same transition with their occurrence", () => {
      const withRepeat = makeConfig({ actions: [approveSales, approveDev] });
      const withoutRepeat = makeConfig({ actions: [approveSales] });

      const added = ProcessManagementDiffDetector.detect(
        withRepeat,
        withoutRepeat,
      );
      const deleted = ProcessManagementDiffDetector.detect(
        withoutRepeat,
        withRepeat,
      );

      expect(added.entries.map((e) => [e.type, e.name])).toEqual([
        ["added", "承認 (一次承認待ち → 最終承認待ち) #2"],
      ]);
      expect(deleted.entries.map((e) => [e.type, e.name])).toEqual([
        ["deleted", "承認 (一次承認待ち → 最終承認待ち) #2"],
      ]);
    });

    it("should report no diff when actions from different states are reordered", () => {
      const local = makeConfig({
        actions: [
          applyToManager,
          sendBackFromFinal,
          sendBackFromFirst,
          applyToDirector,
          approveSales,
          approveDev,
        ],
      });
      const remote = makeConfig({ actions: allActions });

      const result = ProcessManagementDiffDetector.detect(local, remote);

      expect(result.isEmpty).toBe(true);
    });

    it("should report repeats of the same transition when they are reordered", () => {
      const local = makeConfig({ actions: [approveDev, approveSales] });
      const remote = makeConfig({ actions: [approveSales, approveDev] });

      const result = ProcessManagementDiffDetector.detect(local, remote);

      expect(result.entries.map((e) => [e.type, e.name])).toEqual([
        ["modified", "承認 (一次承認待ち → 最終承認待ち)"],
        ["modified", "承認 (一次承認待ち → 最終承認待ち) #2"],
      ]);
    });

    it("should shift later repeats when one is inserted in the middle", () => {
      const approveHr = { ...approveSales, filterCond: '部署 in ("人事")' };
      const local = makeConfig({
        actions: [approveSales, approveHr, approveDev],
      });
      const remote = makeConfig({ actions: [approveSales, approveDev] });

      const result = ProcessManagementDiffDetector.detect(local, remote);

      expect(result.entries).toEqual([
        {
          type: "added",
          category: "action",
          name: "承認 (一次承認待ち → 最終承認待ち) #3",
          details: 'filterCond: "部署 in ("開発")"',
        },
        {
          type: "modified",
          category: "action",
          name: "承認 (一次承認待ち → 最終承認待ち) #2",
          details: 'filterCond: "部署 in ("開発")" -> "部署 in ("人事")"',
        },
      ]);
    });

    it("should not collapse repeated transitions in an unvalidated remote config", () => {
      const local = makeConfig({ actions: [approveSales] });
      const remote = makeConfig({
        actions: [approveSales, approveSales, approveSales],
      });

      const result = ProcessManagementDiffDetector.detect(local, remote);

      expect(result.entries.map((e) => [e.type, e.name])).toEqual([
        ["deleted", "承認 (一次承認待ち → 最終承認待ち) #2"],
        ["deleted", "承認 (一次承認待ち → 最終承認待ち) #3"],
      ]);
    });

    it("should not confuse transitions whose concatenated text collides", () => {
      const local = makeConfig({
        actions: [makeAction({ name: "a (b", from: "c", to: "d" })],
      });
      const remote = makeConfig({
        actions: [makeAction({ name: "a", from: "b (c", to: "d" })],
      });

      const result = ProcessManagementDiffDetector.detect(local, remote);

      expect(result.entries.map((e) => [e.type, e.name])).toEqual([
        ["added", "a (b (c → d)"],
        ["deleted", "a (b (c → d)"],
      ]);
    });

    it("should not confuse transitions that differ only by a separator character", () => {
      const local = makeConfig({
        actions: [makeAction({ name: "a", from: 'b","c', to: "d" })],
      });
      const remote = makeConfig({
        actions: [makeAction({ name: 'a","b', from: "c", to: "d" })],
      });

      const result = ProcessManagementDiffDetector.detect(local, remote);

      expect(result.entries.map((e) => e.type)).toEqual(["added", "deleted"]);
    });
  });

  describe("action order", () => {
    const approve = makeAction({ name: "承認", from: "未処理", to: "完了" });
    const reject = makeAction({ name: "却下", from: "未処理", to: "却下済み" });
    const withdraw = makeAction({
      name: "取り下げ",
      from: "未処理",
      to: "取り下げ済み",
    });
    const sendBack = makeAction({
      name: "差し戻し",
      from: "確認中",
      to: "未処理",
    });
    const confirm = makeAction({ name: "確認", from: "確認中", to: "完了" });

    it("should report a reorder of actions from one state", () => {
      const local = makeConfig({ actions: [reject, approve] });
      const remote = makeConfig({ actions: [approve, reject] });

      const result = ProcessManagementDiffDetector.detect(local, remote);

      expect(result.isEmpty).toBe(false);
      expect(result.entries).toEqual([
        {
          type: "modified",
          category: "actionOrder",
          name: "未処理",
          details:
            "承認 (未処理 → 完了), 却下 (未処理 → 却下済み) -> 却下 (未処理 → 却下済み), 承認 (未処理 → 完了)",
        },
      ]);
      expect(result.summary).toEqual({
        added: 0,
        modified: 1,
        deleted: 0,
        total: 1,
      });
    });

    it("should report a reorder of conditional branches sharing a name", () => {
      const toManager = makeAction({
        name: "申請する",
        to: "課長承認待ち",
        filterCond: "金額 < 500000",
      });
      const toDirector = makeAction({
        name: "申請する",
        to: "部長承認待ち",
        filterCond: "金額 >= 500000",
      });
      const local = makeConfig({ actions: [toDirector, toManager] });
      const remote = makeConfig({ actions: [toManager, toDirector] });

      const result = ProcessManagementDiffDetector.detect(local, remote);

      expect(result.entries).toEqual([
        {
          type: "modified",
          category: "actionOrder",
          name: "未処理",
          details:
            "申請する (未処理 → 課長承認待ち), 申請する (未処理 → 部長承認待ち) -> 申請する (未処理 → 部長承認待ち), 申請する (未処理 → 課長承認待ち)",
        },
      ]);
    });

    it("should report no diff when the order within each state is kept", () => {
      const local = makeConfig({
        actions: [sendBack, approve, confirm, reject],
      });
      const remote = makeConfig({
        actions: [approve, reject, sendBack, confirm],
      });

      const result = ProcessManagementDiffDetector.detect(local, remote);

      expect(result.isEmpty).toBe(true);
    });

    it("should report only the added action when it is inserted between kept ones", () => {
      const local = makeConfig({ actions: [approve, withdraw, reject] });
      const remote = makeConfig({ actions: [approve, reject] });

      const result = ProcessManagementDiffDetector.detect(local, remote);

      expect(result.entries.map((e) => [e.type, e.name])).toEqual([
        ["added", "取り下げ (未処理 → 取り下げ済み)"],
      ]);
    });

    it("should report only the deleted action when the remaining order is kept", () => {
      const local = makeConfig({ actions: [approve, reject] });
      const remote = makeConfig({ actions: [approve, withdraw, reject] });

      const result = ProcessManagementDiffDetector.detect(local, remote);

      expect(result.entries.map((e) => [e.type, e.name])).toEqual([
        ["deleted", "取り下げ (未処理 → 取り下げ済み)"],
      ]);
    });

    it("should compare the order over the actions present on both sides", () => {
      const local = makeConfig({ actions: [withdraw, reject, approve] });
      const remote = makeConfig({ actions: [approve, reject] });

      const result = ProcessManagementDiffDetector.detect(local, remote);

      expect(result.entries).toEqual([
        {
          type: "added",
          category: "action",
          name: "取り下げ (未処理 → 取り下げ済み)",
          details: 'filterCond: ""',
        },
        {
          type: "modified",
          category: "actionOrder",
          name: "未処理",
          details:
            "承認 (未処理 → 完了), 却下 (未処理 → 却下済み) -> 却下 (未処理 → 却下済み), 承認 (未処理 → 完了)",
        },
      ]);
    });

    it("should report both the content change and the reorder", () => {
      const local = makeConfig({
        actions: [reject, { ...approve, type: "SECONDARY" }],
      });
      const remote = makeConfig({ actions: [approve, reject] });

      const result = ProcessManagementDiffDetector.detect(local, remote);

      expect(result.entries).toEqual([
        {
          type: "modified",
          category: "action",
          name: "承認 (未処理 → 完了)",
          details: "type: PRIMARY -> SECONDARY",
        },
        {
          type: "modified",
          category: "actionOrder",
          name: "未処理",
          details:
            "承認 (未処理 → 完了), 却下 (未処理 → 却下済み) -> 却下 (未処理 → 却下済み), 承認 (未処理 → 完了)",
        },
      ]);
    });

    it("should report the order of repeats when another action moves between them", () => {
      const repeatA = makeAction({
        name: "申請",
        to: "審査中",
        filterCond: "c1",
      });
      const repeatB = { ...repeatA, filterCond: "c2" };
      const cancel = makeAction({ name: "取消", to: "取消済み" });
      const local = makeConfig({ actions: [repeatB, cancel, repeatA] });
      const remote = makeConfig({ actions: [repeatA, repeatB, cancel] });

      const result = ProcessManagementDiffDetector.detect(local, remote);

      expect(result.entries).toEqual([
        {
          type: "modified",
          category: "action",
          name: "申請 (未処理 → 審査中)",
          details: 'filterCond: "c1" -> "c2"',
        },
        {
          type: "modified",
          category: "action",
          name: "申請 (未処理 → 審査中) #2",
          details: 'filterCond: "c2" -> "c1"',
        },
        {
          type: "modified",
          category: "actionOrder",
          name: "未処理",
          details:
            "申請 (未処理 → 審査中), 申請 (未処理 → 審査中) #2, 取消 (未処理 → 取消済み) -> 申請 (未処理 → 審査中), 取消 (未処理 → 取消済み), 申請 (未処理 → 審査中) #2",
        },
      ]);
    });

    it("should report one entry per state in local first-appearance order after other modified entries", () => {
      const local = makeConfig({
        actions: [
          reject,
          approve,
          confirm,
          sendBack,
          { ...withdraw, filterCond: "x" },
        ],
      });
      const remote = makeConfig({
        actions: [sendBack, confirm, withdraw, approve, reject],
      });

      const result = ProcessManagementDiffDetector.detect(local, remote);

      expect(
        result.entries.map((e) => [e.type, e.category, e.name, e.details]),
      ).toEqual([
        [
          "modified",
          "action",
          "取り下げ (未処理 → 取り下げ済み)",
          'filterCond: "" -> "x"',
        ],
        [
          "modified",
          "actionOrder",
          "未処理",
          "取り下げ (未処理 → 取り下げ済み), 承認 (未処理 → 完了), 却下 (未処理 → 却下済み) -> 却下 (未処理 → 却下済み), 承認 (未処理 → 完了), 取り下げ (未処理 → 取り下げ済み)",
        ],
        [
          "modified",
          "actionOrder",
          "確認中",
          "差し戻し (確認中 → 未処理), 確認 (確認中 → 完了) -> 確認 (確認中 → 完了), 差し戻し (確認中 → 未処理)",
        ],
      ]);
    });

    it("should order the entries by the first appearance of each state among all local actions", () => {
      const fromA = (name: string, to: string) =>
        makeAction({ name, from: "A", to });
      const fromB = (name: string, to: string) =>
        makeAction({ name, from: "B", to });
      const local = makeConfig({
        actions: [
          fromA("新規", "Z"),
          fromB("q", "Y"),
          fromA("y", "Y"),
          fromA("x", "X"),
          fromB("p", "X"),
        ],
      });
      const remote = makeConfig({
        actions: [
          fromB("p", "X"),
          fromB("q", "Y"),
          fromA("x", "X"),
          fromA("y", "Y"),
        ],
      });

      const result = ProcessManagementDiffDetector.detect(local, remote);

      expect(result.entries.map((e) => [e.type, e.category, e.name])).toEqual([
        ["added", "action", "新規 (A → Z)"],
        ["modified", "actionOrder", "A"],
        ["modified", "actionOrder", "B"],
      ]);
    });

    it("should not confuse an order entry with an action whose label looks alike", () => {
      const local = makeConfig({
        actions: [
          makeAction({ name: "(order) x", from: "y", to: "z" }),
          makeAction({ name: "b", from: "x (y → z)", to: "w" }),
          makeAction({ name: "a", from: "x (y → z)", to: "v" }),
        ],
      });
      const remote = makeConfig({
        actions: [
          makeAction({
            name: "(order) x",
            from: "y",
            to: "z",
            type: "SECONDARY",
          }),
          makeAction({ name: "a", from: "x (y → z)", to: "v" }),
          makeAction({ name: "b", from: "x (y → z)", to: "w" }),
        ],
      });

      const result = ProcessManagementDiffDetector.detect(local, remote);

      expect(result.entries.map((e) => [e.category, e.name])).toEqual([
        ["action", "(order) x (y → z)"],
        ["actionOrder", "x (y → z)"],
      ]);
    });

    it("should report the order entry regardless of which side has an added action", () => {
      const local = makeConfig({ actions: [reject, approve] });
      const remote = makeConfig({ actions: [approve, withdraw, reject] });

      const result = ProcessManagementDiffDetector.detect(local, remote);

      expect(result.entries.map((e) => [e.type, e.category, e.name])).toEqual([
        ["modified", "actionOrder", "未処理"],
        ["deleted", "action", "取り下げ (未処理 → 取り下げ済み)"],
      ]);
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
