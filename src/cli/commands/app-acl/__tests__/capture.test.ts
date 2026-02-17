import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@clack/prompts", () => ({
  spinner: vi.fn(() => ({ start: vi.fn(), stop: vi.fn() })),
  log: {
    info: vi.fn(),
    success: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
  outro: vi.fn(),
}));

vi.mock("@/cli/appAclConfig", () => ({
  appAclArgs: {},
  resolveAppAclContainerConfig: vi.fn(() => ({
    baseUrl: "https://test.cybozu.com",
    auth: { type: "password", username: "user", password: "pass" },
    appId: "1",
    appAclFilePath: "app-acl.yaml",
  })),
  resolveAppAclAppContainerConfig: vi.fn(),
}));

vi.mock("@/cli/projectConfig", () => ({
  routeMultiApp: vi.fn(
    async (
      _values: unknown,
      handlers: { singleLegacy: () => Promise<void> },
    ) => {
      await handlers.singleLegacy();
    },
  ),
  runMultiAppWithFailCheck: vi.fn(),
}));

vi.mock("@/cli/output", () => ({
  printAppHeader: vi.fn(),
}));

vi.mock("@/core/application/container/appPermissionCli", () => ({
  createAppPermissionCliContainer: vi.fn(() => ({})),
}));

vi.mock("@/core/application/appPermission/captureAppPermission");
vi.mock("@/core/application/appPermission/saveAppPermission");

vi.mock("@/cli/handleError", () => ({
  handleCliError: vi.fn(),
}));

import * as p from "@clack/prompts";
import { handleCliError } from "@/cli/handleError";
import { captureAppPermission } from "@/core/application/appPermission/captureAppPermission";
import { saveAppPermission } from "@/core/application/appPermission/saveAppPermission";
import command from "../capture";

afterEach(() => {
  vi.clearAllMocks();
});

describe("app-acl capture コマンド", () => {
  it("アプリ権限をキャプチャしてファイルに保存する", async () => {
    vi.mocked(captureAppPermission).mockResolvedValue({
      configText: "rights:\n  - entity:\n",
      hasExistingConfig: false,
    });
    vi.mocked(saveAppPermission).mockResolvedValue(undefined);

    await command.run({ values: {} } as never);

    expect(captureAppPermission).toHaveBeenCalled();
    expect(saveAppPermission).toHaveBeenCalledWith(
      expect.objectContaining({
        input: { configText: "rights:\n  - entity:\n" },
      }),
    );
  });

  it("保存成功時にファイルパスを含む成功メッセージが表示される", async () => {
    vi.mocked(captureAppPermission).mockResolvedValue({
      configText: "rights:\n",
      hasExistingConfig: false,
    });
    vi.mocked(saveAppPermission).mockResolvedValue(undefined);

    await command.run({ values: {} } as never);

    expect(p.log.success).toHaveBeenCalledWith(
      expect.stringContaining("app-acl.yaml"),
    );
  });

  it("既存設定を上書きした場合、警告メッセージが表示される", async () => {
    vi.mocked(captureAppPermission).mockResolvedValue({
      configText: "rights:\n",
      hasExistingConfig: true,
    });
    vi.mocked(saveAppPermission).mockResolvedValue(undefined);

    await command.run({ values: {} } as never);

    expect(p.log.warn).toHaveBeenCalledWith(
      expect.stringContaining("overwritten"),
    );
  });

  it("既存設定がない場合、上書き警告は表示されない", async () => {
    vi.mocked(captureAppPermission).mockResolvedValue({
      configText: "rights:\n",
      hasExistingConfig: false,
    });
    vi.mocked(saveAppPermission).mockResolvedValue(undefined);

    await command.run({ values: {} } as never);

    expect(p.log.warn).not.toHaveBeenCalled();
  });

  it("エラー発生時にhandleCliErrorで処理される", async () => {
    const error = new Error("API error");
    vi.mocked(captureAppPermission).mockRejectedValue(error);

    await command.run({ values: {} } as never);

    expect(handleCliError).toHaveBeenCalledWith(error);
    expect(saveAppPermission).not.toHaveBeenCalled();
  });
});
