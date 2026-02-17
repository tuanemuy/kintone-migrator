import { describe, expect, it } from "vitest";
import { setupTestProcessManagementContainer } from "@/core/application/__tests__/helpers";
import { isSystemError, isValidationError } from "@/core/application/error";
import { applyProcessManagement } from "../applyProcessManagement";

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

describe("applyProcessManagement", () => {
  const getContainer = setupTestProcessManagementContainer();

  describe("success cases", () => {
    it("設定を読み込み・パース・更新する", async () => {
      const container = getContainer();
      container.processManagementStorage.setContent(VALID_CONFIG);

      await applyProcessManagement({ container });

      expect(container.processManagementConfigurator.callLog).toEqual([
        "getProcessManagement",
        "updateProcessManagement",
      ]);
      expect(
        container.processManagementConfigurator.lastUpdateParams?.config.enable,
      ).toBe(true);
      expect(
        Object.keys(
          container.processManagementConfigurator.lastUpdateParams?.config
            .states ?? {},
        ),
      ).toHaveLength(2);
    });

    it("リビジョンを正しく渡す", async () => {
      const container = getContainer();
      container.processManagementStorage.setContent(VALID_CONFIG);
      container.processManagementConfigurator.setConfig(
        { enable: false, states: {}, actions: [] },
        "42",
      );

      await applyProcessManagement({ container });

      expect(
        container.processManagementConfigurator.lastUpdateParams?.revision,
      ).toBe("42");
    });

    it("enable が変更された場合に enableChanged: true を返す", async () => {
      const container = getContainer();
      container.processManagementStorage.setContent(VALID_CONFIG);
      container.processManagementConfigurator.setConfig({
        enable: false,
        states: {},
        actions: [],
      });

      const result = await applyProcessManagement({ container });

      expect(result.enableChanged).toBe(true);
      expect(result.newEnable).toBe(true);
    });

    it("enable が変更されない場合に enableChanged: false を返す", async () => {
      const container = getContainer();
      container.processManagementStorage.setContent(VALID_CONFIG);
      container.processManagementConfigurator.setConfig({
        enable: true,
        states: {},
        actions: [],
      });

      const result = await applyProcessManagement({ container });

      expect(result.enableChanged).toBe(false);
      expect(result.newEnable).toBe(true);
    });
  });

  describe("error cases", () => {
    it("設定ファイル未存在時に ValidationError をスローする", async () => {
      const container = getContainer();

      await expect(applyProcessManagement({ container })).rejects.toSatisfy(
        isValidationError,
      );
    });

    it("空設定で ValidationError をスローする", async () => {
      const container = getContainer();
      container.processManagementStorage.setContent("");

      await expect(applyProcessManagement({ container })).rejects.toSatisfy(
        isValidationError,
      );
    });

    it("無効なYAMLで ValidationError をスローする", async () => {
      const container = getContainer();
      container.processManagementStorage.setContent("{ invalid: yaml:");

      await expect(applyProcessManagement({ container })).rejects.toSatisfy(
        isValidationError,
      );
    });

    it("storage.get 失敗時に SystemError をスローする", async () => {
      const container = getContainer();
      container.processManagementStorage.setFailOn("get");

      await expect(applyProcessManagement({ container })).rejects.toSatisfy(
        isSystemError,
      );
    });

    it("getProcessManagement 失敗時に SystemError をスローする", async () => {
      const container = getContainer();
      container.processManagementStorage.setContent(VALID_CONFIG);
      container.processManagementConfigurator.setFailOn("getProcessManagement");

      await expect(applyProcessManagement({ container })).rejects.toSatisfy(
        isSystemError,
      );
    });

    it("updateProcessManagement 失敗時に SystemError をスローする", async () => {
      const container = getContainer();
      container.processManagementStorage.setContent(VALID_CONFIG);
      container.processManagementConfigurator.setFailOn(
        "updateProcessManagement",
      );

      await expect(applyProcessManagement({ container })).rejects.toSatisfy(
        isSystemError,
      );
    });
  });
});
