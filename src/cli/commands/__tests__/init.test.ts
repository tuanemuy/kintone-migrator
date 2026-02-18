import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@clack/prompts", () => ({
  spinner: vi.fn(() => ({ start: vi.fn(), stop: vi.fn() })),
  log: {
    info: vi.fn(),
    success: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    message: vi.fn(),
    step: vi.fn(),
  },
  confirm: vi.fn(),
  isCancel: vi.fn(() => false),
}));

vi.mock("@/cli/config", () => ({
  kintoneArgs: {
    domain: { type: "string" },
    username: { type: "string" },
    password: { type: "string" },
    "api-token": { type: "string" },
    "guest-space-id": { type: "string" },
  },
  resolveAuth: vi.fn(() => ({
    type: "password",
    username: "user",
    password: "pass",
  })),
  validateKintoneDomain: vi.fn((domain: string) => `https://${domain}`),
}));

vi.mock("@/core/application/container/initCli", () => ({
  createInitCliContainer: vi.fn(() => ({
    spaceReader: {},
    projectConfigStorage: {
      get: vi.fn().mockResolvedValue({ content: "", exists: false }),
      update: vi.fn().mockResolvedValue(undefined),
    },
  })),
}));

vi.mock("@/core/application/init/fetchSpaceApps");
vi.mock("@/core/application/init/generateProjectConfig");
vi.mock("@/core/application/init/captureAllForApp");

vi.mock("@/core/application/container/captureAllCli", () => ({
  createCliCaptureContainers: vi.fn(() => ({
    containers: {},
    paths: {
      schema: "schemas/app.yaml",
      seed: "seeds/app.yaml",
      customize: "customize/app.yaml",
      view: "view/app.yaml",
      settings: "settings/app.yaml",
      notification: "notification/app.yaml",
      report: "report/app.yaml",
      action: "action/app.yaml",
      process: "process/app.yaml",
      fieldAcl: "field-acl/app.yaml",
      appAcl: "app-acl/app.yaml",
      recordAcl: "record-acl/app.yaml",
      adminNotes: "admin-notes/app.yaml",
      plugin: "plugin/app.yaml",
    },
  })),
}));

vi.mock("@/cli/handleError", () => ({
  handleCliError: vi.fn(),
}));

import * as p from "@clack/prompts";
import { handleCliError } from "@/cli/handleError";
import { createCliCaptureContainers } from "@/core/application/container/captureAllCli";
import { createInitCliContainer } from "@/core/application/container/initCli";
import { captureAllForApp } from "@/core/application/init/captureAllForApp";
import { fetchSpaceApps } from "@/core/application/init/fetchSpaceApps";
import { generateProjectConfig } from "@/core/application/init/generateProjectConfig";
import command from "../init";

afterEach(() => {
  vi.clearAllMocks();
  delete process.env.KINTONE_DOMAIN;
});

describe("init コマンド", () => {
  it("正常にプロジェクトを初期化する", async () => {
    vi.mocked(fetchSpaceApps).mockResolvedValue([
      { appId: "1", code: "myapp", name: "My App" },
    ]);
    vi.mocked(generateProjectConfig).mockReturnValue("domain: test\n");
    vi.mocked(captureAllForApp).mockResolvedValue([
      { domain: "schema", success: true },
    ]);

    await command.run({
      values: {
        "space-id": "1",
        domain: "test.cybozu.com",
        "api-token": "token",
      },
    } as never);

    expect(fetchSpaceApps).toHaveBeenCalled();
    expect(generateProjectConfig).toHaveBeenCalled();
    const container = vi.mocked(createInitCliContainer).mock.results[0].value;
    expect(container.projectConfigStorage.update).toHaveBeenCalledWith(
      "domain: test\n",
    );
    expect(captureAllForApp).toHaveBeenCalled();
    expect(handleCliError).not.toHaveBeenCalled();
  });

  it("KINTONE_DOMAIN が未設定の場合にエラーをスローする", async () => {
    await command.run({
      values: { "space-id": "1" },
    } as never);

    expect(handleCliError).toHaveBeenCalled();
    expect(fetchSpaceApps).not.toHaveBeenCalled();
  });

  it("環境変数からドメインを取得できる", async () => {
    process.env.KINTONE_DOMAIN = "env.cybozu.com";

    vi.mocked(fetchSpaceApps).mockResolvedValue([
      { appId: "1", code: "app1", name: "App 1" },
    ]);
    vi.mocked(generateProjectConfig).mockReturnValue("domain: env\n");
    vi.mocked(captureAllForApp).mockResolvedValue([]);

    await command.run({
      values: { "space-id": "1", "api-token": "token" },
    } as never);

    expect(handleCliError).not.toHaveBeenCalled();
    expect(generateProjectConfig).toHaveBeenCalledWith(
      expect.objectContaining({ domain: "env.cybozu.com" }),
    );
  });

  it("既存設定ファイルがある場合に確認プロンプトを表示する", async () => {
    vi.mocked(createInitCliContainer).mockReturnValue({
      spaceReader: {} as never,
      projectConfigStorage: {
        get: vi.fn().mockResolvedValue({ content: "existing", exists: true }),
        update: vi.fn().mockResolvedValue(undefined),
      },
    });
    vi.mocked(p.confirm).mockResolvedValue(true);

    vi.mocked(fetchSpaceApps).mockResolvedValue([
      { appId: "1", code: "app1", name: "App 1" },
    ]);
    vi.mocked(generateProjectConfig).mockReturnValue("domain: test\n");
    vi.mocked(captureAllForApp).mockResolvedValue([]);

    await command.run({
      values: {
        "space-id": "1",
        domain: "test.cybozu.com",
        "api-token": "token",
      },
    } as never);

    expect(p.confirm).toHaveBeenCalled();
    const container = vi.mocked(createInitCliContainer).mock.results[0].value;
    expect(container.projectConfigStorage.update).toHaveBeenCalled();
  });

  it("既存設定ファイルの上書きを拒否した場合に中断する", async () => {
    vi.mocked(createInitCliContainer).mockReturnValue({
      spaceReader: {} as never,
      projectConfigStorage: {
        get: vi.fn().mockResolvedValue({ content: "existing", exists: true }),
        update: vi.fn().mockResolvedValue(undefined),
      },
    });
    vi.mocked(p.confirm).mockResolvedValue(false);

    vi.mocked(fetchSpaceApps).mockResolvedValue([
      { appId: "1", code: "app1", name: "App 1" },
    ]);
    vi.mocked(generateProjectConfig).mockReturnValue("domain: test\n");

    await command.run({
      values: {
        "space-id": "1",
        domain: "test.cybozu.com",
        "api-token": "token",
      },
    } as never);

    expect(p.log.warn).toHaveBeenCalledWith("Aborted.");
    const container = vi.mocked(createInitCliContainer).mock.results[0].value;
    expect(container.projectConfigStorage.update).not.toHaveBeenCalled();
    expect(captureAllForApp).not.toHaveBeenCalled();
  });

  it("--yes で確認プロンプトをスキップする", async () => {
    vi.mocked(createInitCliContainer).mockReturnValue({
      spaceReader: {} as never,
      projectConfigStorage: {
        get: vi.fn().mockResolvedValue({ content: "existing", exists: true }),
        update: vi.fn().mockResolvedValue(undefined),
      },
    });

    vi.mocked(fetchSpaceApps).mockResolvedValue([
      { appId: "1", code: "app1", name: "App 1" },
    ]);
    vi.mocked(generateProjectConfig).mockReturnValue("domain: test\n");
    vi.mocked(captureAllForApp).mockResolvedValue([]);

    await command.run({
      values: {
        "space-id": "1",
        domain: "test.cybozu.com",
        "api-token": "token",
        yes: true,
      },
    } as never);

    expect(p.confirm).not.toHaveBeenCalled();
    const container = vi.mocked(createInitCliContainer).mock.results[0].value;
    expect(container.projectConfigStorage.update).toHaveBeenCalled();
  });

  it("--output でディレクトリを指定した場合に baseDir が渡される", async () => {
    vi.mocked(createInitCliContainer).mockReturnValue({
      spaceReader: {} as never,
      projectConfigStorage: {
        get: vi.fn().mockResolvedValue({ content: "", exists: false }),
        update: vi.fn().mockResolvedValue(undefined),
      },
    });
    vi.mocked(fetchSpaceApps).mockResolvedValue([
      { appId: "1", code: "myapp", name: "My App" },
    ]);
    vi.mocked(generateProjectConfig).mockReturnValue("domain: test\n");
    vi.mocked(captureAllForApp).mockResolvedValue([
      { domain: "schema", success: true },
    ]);

    await command.run({
      values: {
        "space-id": "1",
        domain: "test.cybozu.com",
        "api-token": "token",
        output: "mydir",
      },
    } as never);

    expect(handleCliError).not.toHaveBeenCalled();
    expect(createInitCliContainer).toHaveBeenCalledWith(
      expect.objectContaining({
        configFilePath: "mydir/kintone-migrator.yaml",
      }),
    );
    expect(generateProjectConfig).toHaveBeenCalledWith(
      expect.objectContaining({ baseDir: "mydir" }),
    );
    expect(createCliCaptureContainers).toHaveBeenCalledWith(
      expect.objectContaining({ baseDir: "mydir" }),
    );
  });

  it("--output 未指定の場合に baseDir が undefined になる", async () => {
    vi.mocked(createInitCliContainer).mockReturnValue({
      spaceReader: {} as never,
      projectConfigStorage: {
        get: vi.fn().mockResolvedValue({ content: "", exists: false }),
        update: vi.fn().mockResolvedValue(undefined),
      },
    });
    vi.mocked(fetchSpaceApps).mockResolvedValue([
      { appId: "1", code: "myapp", name: "My App" },
    ]);
    vi.mocked(generateProjectConfig).mockReturnValue("domain: test\n");
    vi.mocked(captureAllForApp).mockResolvedValue([
      { domain: "schema", success: true },
    ]);

    await command.run({
      values: {
        "space-id": "1",
        domain: "test.cybozu.com",
        "api-token": "token",
      },
    } as never);

    expect(handleCliError).not.toHaveBeenCalled();
    expect(createInitCliContainer).toHaveBeenCalledWith(
      expect.objectContaining({
        configFilePath: "kintone-migrator.yaml",
      }),
    );
    expect(generateProjectConfig).toHaveBeenCalledWith(
      expect.objectContaining({ baseDir: undefined }),
    );
    expect(createCliCaptureContainers).toHaveBeenCalledWith(
      expect.objectContaining({ baseDir: undefined }),
    );
  });

  it("fetchSpaceApps のエラーが handleCliError で処理される", async () => {
    const error = new Error("Space API error");
    vi.mocked(fetchSpaceApps).mockRejectedValue(error);

    await command.run({
      values: {
        "space-id": "1",
        domain: "test.cybozu.com",
        "api-token": "token",
      },
    } as never);

    expect(handleCliError).toHaveBeenCalledWith(error);
  });
});
