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

vi.mock("@/cli/pluginConfig", () => ({
  pluginArgs: {},
  resolvePluginContainerConfig: vi.fn(() => ({
    baseUrl: "https://test.cybozu.com",
    auth: { type: "password", username: "user", password: "pass" },
    appId: "1",
    pluginFilePath: "plugins.yaml",
  })),
  resolvePluginAppContainerConfig: vi.fn(),
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

vi.mock("@/core/application/container/pluginCli", () => ({
  createPluginCliContainer: vi.fn(() => ({})),
}));

vi.mock("@/core/application/plugin/capturePlugin");
vi.mock("@/core/application/plugin/savePlugin");

vi.mock("@/cli/handleError", () => ({
  handleCliError: vi.fn(),
}));

import * as p from "@clack/prompts";
import { handleCliError } from "@/cli/handleError";
import { capturePlugin } from "@/core/application/plugin/capturePlugin";
import { savePlugin } from "@/core/application/plugin/savePlugin";
import command from "../capture";

afterEach(() => {
  vi.clearAllMocks();
});

describe("plugin capture コマンド", () => {
  it("プラグインをキャプチャしてファイルに保存する", async () => {
    vi.mocked(capturePlugin).mockResolvedValue({
      configText: "plugins:\n  - id: plugin1\n",
      hasExistingConfig: false,
    });
    vi.mocked(savePlugin).mockResolvedValue(undefined);

    await command.run({ values: {} } as never);

    expect(capturePlugin).toHaveBeenCalled();
    expect(savePlugin).toHaveBeenCalledWith(
      expect.objectContaining({
        input: { configText: "plugins:\n  - id: plugin1\n" },
      }),
    );
  });

  it("保存成功時にファイルパスを含む成功メッセージが表示される", async () => {
    vi.mocked(capturePlugin).mockResolvedValue({
      configText: "plugins:\n",
      hasExistingConfig: false,
    });
    vi.mocked(savePlugin).mockResolvedValue(undefined);

    await command.run({ values: {} } as never);

    expect(p.log.success).toHaveBeenCalledWith(
      expect.stringContaining("plugins.yaml"),
    );
  });

  it("既存設定を上書きした場合、警告メッセージが表示される", async () => {
    vi.mocked(capturePlugin).mockResolvedValue({
      configText: "plugins:\n",
      hasExistingConfig: true,
    });
    vi.mocked(savePlugin).mockResolvedValue(undefined);

    await command.run({ values: {} } as never);

    expect(p.log.warn).toHaveBeenCalledWith(
      expect.stringContaining("overwritten"),
    );
  });

  it("既存設定がない場合、上書き警告は表示されない", async () => {
    vi.mocked(capturePlugin).mockResolvedValue({
      configText: "plugins:\n",
      hasExistingConfig: false,
    });
    vi.mocked(savePlugin).mockResolvedValue(undefined);

    await command.run({ values: {} } as never);

    expect(p.log.warn).not.toHaveBeenCalled();
  });

  it("エラー発生時にhandleCliErrorで処理される", async () => {
    const error = new Error("API error");
    vi.mocked(capturePlugin).mockRejectedValue(error);

    await command.run({ values: {} } as never);

    expect(handleCliError).toHaveBeenCalledWith(error);
    expect(savePlugin).not.toHaveBeenCalled();
  });
});
