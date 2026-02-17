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

vi.mock("@/cli/reportConfig", () => ({
  reportArgs: {},
  resolveReportContainerConfig: vi.fn(() => ({
    baseUrl: "https://test.cybozu.com",
    auth: { type: "password", username: "user", password: "pass" },
    appId: "1",
    reportFilePath: "reports.yaml",
  })),
  resolveReportAppContainerConfig: vi.fn(),
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

vi.mock("@/core/application/container/reportCli", () => ({
  createReportCliContainer: vi.fn(() => ({})),
}));

vi.mock("@/core/application/report/captureReport");
vi.mock("@/core/application/report/saveReport");

vi.mock("@/cli/handleError", () => ({
  handleCliError: vi.fn(),
}));

import * as p from "@clack/prompts";
import { handleCliError } from "@/cli/handleError";
import { captureReport } from "@/core/application/report/captureReport";
import { saveReport } from "@/core/application/report/saveReport";
import command from "../capture";

afterEach(() => {
  vi.clearAllMocks();
});

describe("report capture コマンド", () => {
  it("レポート設定をキャプチャしてファイルに保存する", async () => {
    vi.mocked(captureReport).mockResolvedValue({
      configText: "reports:\n  テスト:\n    chartType: BAR\n",
      hasExistingConfig: false,
    });
    vi.mocked(saveReport).mockResolvedValue(undefined);

    await command.run({ values: {} } as never);

    expect(captureReport).toHaveBeenCalled();
    expect(saveReport).toHaveBeenCalledWith(
      expect.objectContaining({
        input: { configText: "reports:\n  テスト:\n    chartType: BAR\n" },
      }),
    );
  });

  it("保存成功時にファイルパスを含む成功メッセージが表示される", async () => {
    vi.mocked(captureReport).mockResolvedValue({
      configText: "reports: {}\n",
      hasExistingConfig: false,
    });
    vi.mocked(saveReport).mockResolvedValue(undefined);

    await command.run({ values: {} } as never);

    expect(p.log.success).toHaveBeenCalledWith(
      expect.stringContaining("reports.yaml"),
    );
  });

  it("既存設定を上書きした場合、警告メッセージが表示される", async () => {
    vi.mocked(captureReport).mockResolvedValue({
      configText: "reports: {}\n",
      hasExistingConfig: true,
    });
    vi.mocked(saveReport).mockResolvedValue(undefined);

    await command.run({ values: {} } as never);

    expect(p.log.warn).toHaveBeenCalledWith(
      expect.stringContaining("overwritten"),
    );
  });

  it("既存設定がない場合、上書き警告は表示されない", async () => {
    vi.mocked(captureReport).mockResolvedValue({
      configText: "reports: {}\n",
      hasExistingConfig: false,
    });
    vi.mocked(saveReport).mockResolvedValue(undefined);

    await command.run({ values: {} } as never);

    expect(p.log.warn).not.toHaveBeenCalled();
  });

  it("エラー発生時にhandleCliErrorで処理される", async () => {
    const error = new Error("API error");
    vi.mocked(captureReport).mockRejectedValue(error);

    await command.run({ values: {} } as never);

    expect(handleCliError).toHaveBeenCalledWith(error);
    expect(saveReport).not.toHaveBeenCalled();
  });
});
