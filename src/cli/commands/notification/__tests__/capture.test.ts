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

vi.mock("@/cli/notificationConfig", () => ({
  notificationArgs: {},
  resolveNotificationContainerConfig: vi.fn(() => ({
    baseUrl: "https://test.cybozu.com",
    auth: { type: "password", username: "user", password: "pass" },
    appId: "1",
    notificationFilePath: "notification.yaml",
  })),
  resolveNotificationAppContainerConfig: vi.fn(),
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

vi.mock("@/core/application/container/notificationCli", () => ({
  createNotificationCliContainer: vi.fn(() => ({})),
}));

vi.mock("@/core/application/notification/captureNotification");
vi.mock("@/core/application/notification/saveNotification");

vi.mock("@/cli/handleError", () => ({
  handleCliError: vi.fn(),
}));

import * as p from "@clack/prompts";
import { handleCliError } from "@/cli/handleError";
import { captureNotification } from "@/core/application/notification/captureNotification";
import { saveNotification } from "@/core/application/notification/saveNotification";
import command from "../capture";

afterEach(() => {
  vi.clearAllMocks();
});

describe("notification capture コマンド", () => {
  it("通知設定をキャプチャしてファイルに保存する", async () => {
    vi.mocked(captureNotification).mockResolvedValue({
      configText: "general:\n  notifyToCommenter: true\n",
      hasExistingConfig: false,
    });
    vi.mocked(saveNotification).mockResolvedValue(undefined);

    await command.run({ values: {} } as never);

    expect(captureNotification).toHaveBeenCalled();
    expect(saveNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        input: { configText: "general:\n  notifyToCommenter: true\n" },
      }),
    );
  });

  it("保存成功時にファイルパスを含む成功メッセージが表示される", async () => {
    vi.mocked(captureNotification).mockResolvedValue({
      configText: "general:\n",
      hasExistingConfig: false,
    });
    vi.mocked(saveNotification).mockResolvedValue(undefined);

    await command.run({ values: {} } as never);

    expect(p.log.success).toHaveBeenCalledWith(
      expect.stringContaining("notification.yaml"),
    );
  });

  it("既存設定を上書きした場合、警告メッセージが表示される", async () => {
    vi.mocked(captureNotification).mockResolvedValue({
      configText: "general:\n",
      hasExistingConfig: true,
    });
    vi.mocked(saveNotification).mockResolvedValue(undefined);

    await command.run({ values: {} } as never);

    expect(p.log.warn).toHaveBeenCalledWith(
      expect.stringContaining("overwritten"),
    );
  });

  it("既存設定がない場合、上書き警告は表示されない", async () => {
    vi.mocked(captureNotification).mockResolvedValue({
      configText: "general:\n",
      hasExistingConfig: false,
    });
    vi.mocked(saveNotification).mockResolvedValue(undefined);

    await command.run({ values: {} } as never);

    expect(p.log.warn).not.toHaveBeenCalled();
  });

  it("エラー発生時にhandleCliErrorで処理される", async () => {
    const error = new Error("API error");
    vi.mocked(captureNotification).mockRejectedValue(error);

    await command.run({ values: {} } as never);

    expect(handleCliError).toHaveBeenCalledWith(error);
    expect(saveNotification).not.toHaveBeenCalled();
  });
});
