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

vi.mock("@/cli/actionConfig", () => ({
  actionArgs: {},
  resolveActionContainerConfig: vi.fn(() => ({
    baseUrl: "https://test.cybozu.com",
    auth: { type: "password", username: "user", password: "pass" },
    appId: "1",
    actionFilePath: "actions.yaml",
  })),
  resolveActionAppContainerConfig: vi.fn(),
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

vi.mock("@/core/application/container/actionCli", () => ({
  createActionCliContainer: vi.fn(() => ({})),
}));

vi.mock("@/core/application/action/captureAction");
vi.mock("@/core/application/action/saveAction");

vi.mock("@/cli/handleError", () => ({
  handleCliError: vi.fn(),
}));

import * as p from "@clack/prompts";
import { handleCliError } from "@/cli/handleError";
import { captureAction } from "@/core/application/action/captureAction";
import { saveAction } from "@/core/application/action/saveAction";
import command from "../capture";

afterEach(() => {
  vi.clearAllMocks();
});

describe("action capture コマンド", () => {
  it("アクション設定をキャプチャしてファイルに保存する", async () => {
    vi.mocked(captureAction).mockResolvedValue({
      configText: "actions:\n  test:\n    index: 0\n",
      hasExistingConfig: false,
    });
    vi.mocked(saveAction).mockResolvedValue(undefined);

    await command.run({ values: {} } as never);

    expect(captureAction).toHaveBeenCalled();
    expect(saveAction).toHaveBeenCalledWith(
      expect.objectContaining({
        input: { configText: "actions:\n  test:\n    index: 0\n" },
      }),
    );
  });

  it("保存成功時にファイルパスを含む成功メッセージが表示される", async () => {
    vi.mocked(captureAction).mockResolvedValue({
      configText: "actions:\n",
      hasExistingConfig: false,
    });
    vi.mocked(saveAction).mockResolvedValue(undefined);

    await command.run({ values: {} } as never);

    expect(p.log.success).toHaveBeenCalledWith(
      expect.stringContaining("actions.yaml"),
    );
  });

  it("既存設定を上書きした場合、警告メッセージが表示される", async () => {
    vi.mocked(captureAction).mockResolvedValue({
      configText: "actions:\n",
      hasExistingConfig: true,
    });
    vi.mocked(saveAction).mockResolvedValue(undefined);

    await command.run({ values: {} } as never);

    expect(p.log.warn).toHaveBeenCalledWith(
      expect.stringContaining("overwritten"),
    );
  });

  it("既存設定がない場合、上書き警告は表示されない", async () => {
    vi.mocked(captureAction).mockResolvedValue({
      configText: "actions:\n",
      hasExistingConfig: false,
    });
    vi.mocked(saveAction).mockResolvedValue(undefined);

    await command.run({ values: {} } as never);

    expect(p.log.warn).not.toHaveBeenCalled();
  });

  it("エラー発生時にhandleCliErrorで処理される", async () => {
    const error = new Error("API error");
    vi.mocked(captureAction).mockRejectedValue(error);

    await command.run({ values: {} } as never);

    expect(handleCliError).toHaveBeenCalledWith(error);
    expect(saveAction).not.toHaveBeenCalled();
  });
});
