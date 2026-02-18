import type { KintoneRestAPIClient } from "@kintone/rest-api-client";
import { describe, expect, it, vi } from "vitest";
import { SystemError } from "@/core/application/error";
import { BusinessRuleError } from "@/core/domain/error";
import { FormSchemaErrorCode } from "@/core/domain/formSchema/errorCode";
import { KintoneAppDeployer } from "../appDeployer";

function createMockClient(
  overrides: {
    deployApp?: (params: unknown) => Promise<unknown>;
    getDeployStatus?: (params: unknown) => Promise<unknown>;
  } = {},
) {
  return {
    app: {
      deployApp: vi.fn(overrides.deployApp ?? (() => Promise.resolve({}))),
      getDeployStatus: vi.fn(
        overrides.getDeployStatus ??
          (() => Promise.resolve({ apps: [{ status: "SUCCESS" }] })),
      ),
    },
  } as unknown as KintoneRestAPIClient;
}

describe("KintoneAppDeployer", () => {
  const APP_ID = "1";

  describe("デプロイ成功時の振る舞い", () => {
    it("デプロイAPIを呼び出してステータスがSUCCESSになるまでポーリングする", async () => {
      let callCount = 0;
      const client = createMockClient({
        getDeployStatus: () => {
          callCount++;
          if (callCount < 3) {
            return Promise.resolve({ apps: [{ status: "PROCESSING" }] });
          }
          return Promise.resolve({ apps: [{ status: "SUCCESS" }] });
        },
      });
      const deployer = new KintoneAppDeployer(client, APP_ID, {
        pollIntervalMs: 0,
      });

      await deployer.deploy();

      expect(client.app.deployApp).toHaveBeenCalledWith({
        apps: [{ app: APP_ID }],
      });
      expect(client.app.getDeployStatus).toHaveBeenCalledTimes(3);
    });

    it("初回ポーリングでSUCCESSならすぐに完了する", async () => {
      const client = createMockClient();
      const deployer = new KintoneAppDeployer(client, APP_ID, {
        pollIntervalMs: 0,
      });

      await deployer.deploy();

      expect(client.app.getDeployStatus).toHaveBeenCalledTimes(1);
    });
  });

  describe("デプロイ失敗時の振る舞い", () => {
    it("ステータスがFAILの場合、SystemErrorをスローする", async () => {
      const client = createMockClient({
        getDeployStatus: () => Promise.resolve({ apps: [{ status: "FAIL" }] }),
      });
      const deployer = new KintoneAppDeployer(client, APP_ID, {
        pollIntervalMs: 0,
      });

      await expect(deployer.deploy()).rejects.toThrow(SystemError);
      await expect(deployer.deploy()).rejects.toThrow("App deployment failed");
    });

    it("ステータスがCANCELの場合、SystemErrorをスローする", async () => {
      const client = createMockClient({
        getDeployStatus: () =>
          Promise.resolve({ apps: [{ status: "CANCEL" }] }),
      });
      const deployer = new KintoneAppDeployer(client, APP_ID, {
        pollIntervalMs: 0,
      });

      await expect(deployer.deploy()).rejects.toThrow(SystemError);
      await expect(deployer.deploy()).rejects.toThrow(
        "App deployment was cancelled",
      );
    });

    it("予期しないステータスの場合、SystemErrorをスローする", async () => {
      const client = createMockClient({
        getDeployStatus: () =>
          Promise.resolve({ apps: [{ status: "UNKNOWN_STATUS" }] }),
      });
      const deployer = new KintoneAppDeployer(client, APP_ID, {
        pollIntervalMs: 0,
      });

      await expect(deployer.deploy()).rejects.toThrow(SystemError);
      await expect(deployer.deploy()).rejects.toThrow(
        "Unexpected deploy status",
      );
    });

    it("ポーリング回数の上限を超えた場合、タイムアウトのSystemErrorをスローする", async () => {
      const client = createMockClient({
        getDeployStatus: () =>
          Promise.resolve({ apps: [{ status: "PROCESSING" }] }),
      });
      const deployer = new KintoneAppDeployer(client, APP_ID, {
        pollIntervalMs: 0,
        maxRetries: 3,
      });

      await expect(deployer.deploy()).rejects.toThrow(SystemError);
      await expect(deployer.deploy()).rejects.toThrow(
        "App deployment timed out",
      );
      expect(client.app.getDeployStatus).toHaveBeenCalledTimes(6); // 3 retries * 2 calls
    });
  });

  describe("エラーハンドリング", () => {
    it("deployAppのAPI呼び出しが失敗した場合、SystemErrorをスローする", async () => {
      const client = createMockClient({
        deployApp: () => Promise.reject(new Error("Network error")),
      });
      const deployer = new KintoneAppDeployer(client, APP_ID, {
        pollIntervalMs: 0,
      });

      await expect(deployer.deploy()).rejects.toThrow(SystemError);
      await expect(deployer.deploy()).rejects.toThrow("Failed to deploy app");
    });

    it("BusinessRuleErrorはそのまま再スローする", async () => {
      const bizError = new BusinessRuleError(
        FormSchemaErrorCode.FsInvalidSchemaStructure,
        "test error",
      );
      const client = createMockClient({
        deployApp: () => Promise.reject(bizError),
      });
      const deployer = new KintoneAppDeployer(client, APP_ID, {
        pollIntervalMs: 0,
      });

      await expect(deployer.deploy()).rejects.toThrow(bizError);
    });

    it("SystemErrorはそのまま再スローする", async () => {
      const sysError = new SystemError("EXTERNAL_API_ERROR", "existing error");
      const client = createMockClient({
        deployApp: () => Promise.reject(sysError),
      });
      const deployer = new KintoneAppDeployer(client, APP_ID, {
        pollIntervalMs: 0,
      });

      await expect(deployer.deploy()).rejects.toThrow(sysError);
    });

    it("ポーリング中にAPIエラーが発生した場合、SystemErrorをスローする", async () => {
      const client = createMockClient({
        getDeployStatus: () => Promise.reject(new Error("Status check failed")),
      });
      const deployer = new KintoneAppDeployer(client, APP_ID, {
        pollIntervalMs: 0,
      });

      await expect(deployer.deploy()).rejects.toThrow(SystemError);
    });
  });

  describe("設定", () => {
    it("デフォルト設定で動作する", async () => {
      const client = createMockClient();
      // デフォルト設定 (pollIntervalMs: 1000, maxRetries: 180)
      const deployer = new KintoneAppDeployer(client, APP_ID);

      // 即SUCCESSなので短時間で完了する
      await deployer.deploy();

      expect(client.app.deployApp).toHaveBeenCalledTimes(1);
    });
  });
});
