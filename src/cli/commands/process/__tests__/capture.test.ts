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

vi.mock("@/cli/processConfig", () => ({
  processArgs: {},
  resolveProcessContainerConfig: vi.fn(() => ({
    baseUrl: "https://test.cybozu.com",
    auth: { type: "password", username: "user", password: "pass" },
    appId: "1",
    processFilePath: "process.yaml",
  })),
  resolveProcessAppContainerConfig: vi.fn(),
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

vi.mock("@/core/application/container/processManagementCli", () => ({
  createProcessManagementCliContainer: vi.fn(() => ({})),
}));

vi.mock("@/core/application/processManagement/captureProcessManagement");
vi.mock("@/core/application/processManagement/saveProcessManagement");

vi.mock("@/cli/handleError", () => ({
  handleCliError: vi.fn(),
}));

import * as p from "@clack/prompts";
import { handleCliError } from "@/cli/handleError";
import { captureProcessManagement } from "@/core/application/processManagement/captureProcessManagement";
import { saveProcessManagement } from "@/core/application/processManagement/saveProcessManagement";
import command from "../capture";

afterEach(() => {
  vi.clearAllMocks();
});

describe("process capture コマンド", () => {
  it("プロセス管理設定をキャプチャしてファイルに保存する", async () => {
    vi.mocked(captureProcessManagement).mockResolvedValue({
      configText: "enable: true\nstates:\n",
      hasExistingConfig: false,
    });
    vi.mocked(saveProcessManagement).mockResolvedValue(undefined);

    await command.run({ values: {} } as never);

    expect(captureProcessManagement).toHaveBeenCalled();
    expect(saveProcessManagement).toHaveBeenCalledWith(
      expect.objectContaining({
        input: { configText: "enable: true\nstates:\n" },
      }),
    );
  });

  it("保存成功時にファイルパスを含む成功メッセージが表示される", async () => {
    vi.mocked(captureProcessManagement).mockResolvedValue({
      configText: "enable: false\n",
      hasExistingConfig: false,
    });
    vi.mocked(saveProcessManagement).mockResolvedValue(undefined);

    await command.run({ values: {} } as never);

    expect(p.log.success).toHaveBeenCalledWith(
      expect.stringContaining("process.yaml"),
    );
  });

  it("既存設定を上書きした場合、警告メッセージが表示される", async () => {
    vi.mocked(captureProcessManagement).mockResolvedValue({
      configText: "enable: false\n",
      hasExistingConfig: true,
    });
    vi.mocked(saveProcessManagement).mockResolvedValue(undefined);

    await command.run({ values: {} } as never);

    expect(p.log.warn).toHaveBeenCalledWith(
      expect.stringContaining("overwritten"),
    );
  });

  it("既存設定がない場合、上書き警告は表示されない", async () => {
    vi.mocked(captureProcessManagement).mockResolvedValue({
      configText: "enable: false\n",
      hasExistingConfig: false,
    });
    vi.mocked(saveProcessManagement).mockResolvedValue(undefined);

    await command.run({ values: {} } as never);

    expect(p.log.warn).not.toHaveBeenCalled();
  });

  it("エラー発生時にhandleCliErrorで処理される", async () => {
    const error = new Error("API error");
    vi.mocked(captureProcessManagement).mockRejectedValue(error);

    await command.run({ values: {} } as never);

    expect(handleCliError).toHaveBeenCalledWith(error);
    expect(saveProcessManagement).not.toHaveBeenCalled();
  });
});
