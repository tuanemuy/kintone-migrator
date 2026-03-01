import { describe, expect, it } from "vitest";
import { setupTestProcessManagementContainer } from "@/core/application/__tests__/helpers";
import { isSystemError, isValidationError } from "@/core/application/error";
import { detectProcessManagementDiff } from "../detectProcessManagementDiff";

const VALID_CONFIG = `
enable: true
states:
  未処理:
    index: 0
    assignee:
      type: ONE
      entities:
        - type: USER
          code: user1
  処理中:
    index: 1
    assignee:
      type: ALL
      entities:
        - type: GROUP
          code: group1
actions:
  - name: 承認
    from: 未処理
    to: 処理中
    filterCond: ""
`;

describe("detectProcessManagementDiff", () => {
  const getContainer = setupTestProcessManagementContainer();

  describe("success cases", () => {
    it("変更なしの場合に空の結果を返す", async () => {
      const container = getContainer();
      container.processManagementStorage.setContent(VALID_CONFIG);
      container.processManagementConfigurator.setConfig({
        enable: true,
        states: {
          未処理: {
            index: 0,
            assignee: {
              type: "ONE",
              entities: [{ type: "USER", code: "user1" }],
            },
          },
          処理中: {
            index: 1,
            assignee: {
              type: "ALL",
              entities: [{ type: "GROUP", code: "group1" }],
            },
          },
        },
        actions: [
          {
            name: "承認",
            from: "未処理",
            to: "処理中",
            filterCond: "",
            type: "PRIMARY",
          },
        ],
      });

      const result = await detectProcessManagementDiff({ container });

      expect(result.isEmpty).toBe(true);
      expect(result.entries).toHaveLength(0);
    });

    it("enable フラグの変更を検出する", async () => {
      const container = getContainer();
      container.processManagementStorage.setContent(VALID_CONFIG);
      container.processManagementConfigurator.setConfig({
        enable: false,
        states: {
          未処理: {
            index: 0,
            assignee: {
              type: "ONE",
              entities: [{ type: "USER", code: "user1" }],
            },
          },
          処理中: {
            index: 1,
            assignee: {
              type: "ALL",
              entities: [{ type: "GROUP", code: "group1" }],
            },
          },
        },
        actions: [
          {
            name: "承認",
            from: "未処理",
            to: "処理中",
            filterCond: "",
            type: "PRIMARY",
          },
        ],
      });

      const result = await detectProcessManagementDiff({ container });

      expect(result.isEmpty).toBe(false);
      const enableEntry = result.entries.find((e) => e.category === "enable");
      expect(enableEntry).toBeDefined();
      expect(enableEntry?.type).toBe("modified");
    });

    it("state の追加を検出する", async () => {
      const container = getContainer();
      container.processManagementStorage.setContent(VALID_CONFIG);
      container.processManagementConfigurator.setConfig({
        enable: true,
        states: {
          未処理: {
            index: 0,
            assignee: {
              type: "ONE",
              entities: [{ type: "USER", code: "user1" }],
            },
          },
        },
        actions: [],
      });

      const result = await detectProcessManagementDiff({ container });

      const addedState = result.entries.find(
        (e) => e.category === "state" && e.type === "added",
      );
      expect(addedState).toBeDefined();
      expect(addedState?.name).toBe("処理中");
      expect(result.summary.added).toBeGreaterThanOrEqual(1);
    });

    it("state の削除を検出する", async () => {
      const container = getContainer();
      const localConfig = `
enable: true
states:
  未処理:
    index: 0
    assignee:
      type: ONE
      entities:
        - type: USER
          code: user1
actions: []
`;
      container.processManagementStorage.setContent(localConfig);
      container.processManagementConfigurator.setConfig({
        enable: true,
        states: {
          未処理: {
            index: 0,
            assignee: {
              type: "ONE",
              entities: [{ type: "USER", code: "user1" }],
            },
          },
          処理中: {
            index: 1,
            assignee: {
              type: "ALL",
              entities: [{ type: "GROUP", code: "group1" }],
            },
          },
        },
        actions: [],
      });

      const result = await detectProcessManagementDiff({ container });

      const deletedState = result.entries.find(
        (e) => e.category === "state" && e.type === "deleted",
      );
      expect(deletedState).toBeDefined();
      expect(deletedState?.name).toBe("処理中");
      expect(result.summary.deleted).toBeGreaterThanOrEqual(1);
    });

    it("state の変更を検出する", async () => {
      const container = getContainer();
      container.processManagementStorage.setContent(VALID_CONFIG);
      container.processManagementConfigurator.setConfig({
        enable: true,
        states: {
          未処理: {
            index: 0,
            assignee: {
              type: "ANY",
              entities: [{ type: "USER", code: "user1" }],
            },
          },
          処理中: {
            index: 1,
            assignee: {
              type: "ALL",
              entities: [{ type: "GROUP", code: "group1" }],
            },
          },
        },
        actions: [
          {
            name: "承認",
            from: "未処理",
            to: "処理中",
            filterCond: "",
            type: "PRIMARY",
          },
        ],
      });

      const result = await detectProcessManagementDiff({ container });

      const modifiedState = result.entries.find(
        (e) => e.category === "state" && e.type === "modified",
      );
      expect(modifiedState).toBeDefined();
      expect(modifiedState?.name).toBe("未処理");
      expect(result.summary.modified).toBeGreaterThanOrEqual(1);
    });

    it("action の追加を検出する", async () => {
      const container = getContainer();
      container.processManagementStorage.setContent(VALID_CONFIG);
      container.processManagementConfigurator.setConfig({
        enable: true,
        states: {
          未処理: {
            index: 0,
            assignee: {
              type: "ONE",
              entities: [{ type: "USER", code: "user1" }],
            },
          },
          処理中: {
            index: 1,
            assignee: {
              type: "ALL",
              entities: [{ type: "GROUP", code: "group1" }],
            },
          },
        },
        actions: [],
      });

      const result = await detectProcessManagementDiff({ container });

      const addedAction = result.entries.find(
        (e) => e.category === "action" && e.type === "added",
      );
      expect(addedAction).toBeDefined();
      expect(addedAction?.name).toBe("承認");
    });

    it("action の削除を検出する", async () => {
      const container = getContainer();
      const localConfig = `
enable: true
states:
  未処理:
    index: 0
    assignee:
      type: ONE
      entities:
        - type: USER
          code: user1
  処理中:
    index: 1
    assignee:
      type: ALL
      entities:
        - type: GROUP
          code: group1
actions: []
`;
      container.processManagementStorage.setContent(localConfig);
      container.processManagementConfigurator.setConfig({
        enable: true,
        states: {
          未処理: {
            index: 0,
            assignee: {
              type: "ONE",
              entities: [{ type: "USER", code: "user1" }],
            },
          },
          処理中: {
            index: 1,
            assignee: {
              type: "ALL",
              entities: [{ type: "GROUP", code: "group1" }],
            },
          },
        },
        actions: [
          {
            name: "承認",
            from: "未処理",
            to: "処理中",
            filterCond: "",
            type: "PRIMARY",
          },
        ],
      });

      const result = await detectProcessManagementDiff({ container });

      const deletedAction = result.entries.find(
        (e) => e.category === "action" && e.type === "deleted",
      );
      expect(deletedAction).toBeDefined();
      expect(deletedAction?.name).toBe("承認");
    });

    it("action の変更を検出する（filterCond変更）", async () => {
      const container = getContainer();
      container.processManagementStorage.setContent(VALID_CONFIG);
      container.processManagementConfigurator.setConfig({
        enable: true,
        states: {
          未処理: {
            index: 0,
            assignee: {
              type: "ONE",
              entities: [{ type: "USER", code: "user1" }],
            },
          },
          処理中: {
            index: 1,
            assignee: {
              type: "ALL",
              entities: [{ type: "GROUP", code: "group1" }],
            },
          },
        },
        actions: [
          {
            name: "承認",
            from: "未処理",
            to: "処理中",
            filterCond: 'status = "active"',
            type: "PRIMARY",
          },
        ],
      });

      const result = await detectProcessManagementDiff({ container });

      const modifiedAction = result.entries.find(
        (e) => e.category === "action" && e.type === "modified",
      );
      expect(modifiedAction).toBeDefined();
      expect(modifiedAction?.name).toBe("承認");
      expect(modifiedAction?.details).toContain("filterCond");
    });

    it("summary が正しくカウントされる", async () => {
      const container = getContainer();
      container.processManagementStorage.setContent(VALID_CONFIG);
      container.processManagementConfigurator.setConfig({
        enable: false,
        states: {},
        actions: [],
      });

      const result = await detectProcessManagementDiff({ container });

      expect(result.summary.added).toBeGreaterThanOrEqual(1);
      expect(result.summary.modified).toBeGreaterThanOrEqual(1);
      expect(result.isEmpty).toBe(false);
    });
  });

  describe("error cases", () => {
    it("設定ファイル未存在時に ValidationError をスローする", async () => {
      const container = getContainer();

      await expect(
        detectProcessManagementDiff({ container }),
      ).rejects.toSatisfy(
        (error) => isValidationError(error) && error.code === "INVALID_INPUT",
      );
    });

    it("storage.get 失敗時に SystemError をスローする", async () => {
      const container = getContainer();
      container.processManagementStorage.setFailOn("get");

      await expect(
        detectProcessManagementDiff({ container }),
      ).rejects.toSatisfy(isSystemError);
    });

    it("getProcessManagement 失敗時に SystemError をスローする", async () => {
      const container = getContainer();
      container.processManagementStorage.setContent(VALID_CONFIG);
      container.processManagementConfigurator.setFailOn("getProcessManagement");

      await expect(
        detectProcessManagementDiff({ container }),
      ).rejects.toSatisfy(isSystemError);
    });
  });
});
