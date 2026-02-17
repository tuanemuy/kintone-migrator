import { describe, expect, it } from "vitest";
import { setupTestProcessManagementContainer } from "@/core/application/__tests__/helpers";
import { isSystemError } from "@/core/application/error";
import { captureProcessManagement } from "../captureProcessManagement";

describe("captureProcessManagement", () => {
  const getContainer = setupTestProcessManagementContainer();

  describe("success cases", () => {
    it("プロセス管理設定を取得してYAMLにシリアライズする", async () => {
      const container = getContainer();
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

      const result = await captureProcessManagement({ container });

      expect(result.configText).toContain("未処理");
      expect(result.configText).toContain("user1");
      expect(result.configText).toContain("enable: true");
      expect(result.hasExistingConfig).toBe(false);
    });

    it("既存設定ファイルがある場合を検出する", async () => {
      const container = getContainer();
      container.processManagementConfigurator.setConfig({
        enable: false,
        states: {},
        actions: [],
      });
      container.processManagementStorage.setContent("existing content");

      const result = await captureProcessManagement({ container });

      expect(result.hasExistingConfig).toBe(true);
    });

    it("既存設定ファイルがない場合を報告する", async () => {
      const container = getContainer();
      container.processManagementConfigurator.setConfig({
        enable: false,
        states: {},
        actions: [],
      });

      const result = await captureProcessManagement({ container });

      expect(result.hasExistingConfig).toBe(false);
    });
  });

  describe("error cases", () => {
    it("getProcessManagement 失敗時に SystemError をスローする", async () => {
      const container = getContainer();
      container.processManagementConfigurator.setFailOn("getProcessManagement");

      await expect(captureProcessManagement({ container })).rejects.toSatisfy(
        isSystemError,
      );
    });

    it("storage.get 失敗時に SystemError をスローする", async () => {
      const container = getContainer();
      container.processManagementStorage.setFailOn("get");

      await expect(captureProcessManagement({ container })).rejects.toSatisfy(
        isSystemError,
      );
    });
  });
});
