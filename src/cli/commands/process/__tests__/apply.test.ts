import { afterEach, describe, expect, it, vi } from "vitest";

const mockDeploy = vi.fn();

vi.mock("@clack/prompts", () => ({
  spinner: vi.fn(() => ({ start: vi.fn(), stop: vi.fn() })),
  log: {
    info: vi.fn(),
    success: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
  confirm: vi.fn(() => true),
  outro: vi.fn(),
  isCancel: vi.fn(() => false),
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

vi.mock("@/cli/output", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/cli/output")>()),
  printAppHeader: vi.fn(),
}));

vi.mock("@/cli/config", () => ({
  confirmArgs: {},
}));

vi.mock("@/core/application/container/processManagementCli", () => ({
  createProcessManagementCliContainer: vi.fn(() => ({
    appDeployer: { deploy: mockDeploy },
  })),
}));

vi.mock("@/core/application/processManagement/applyProcessManagement");

vi.mock("@/cli/handleError", () => ({
  handleCliError: vi.fn(),
}));

import * as p from "@clack/prompts";
import { handleCliError } from "@/cli/handleError";
import { applyProcessManagement } from "@/core/application/processManagement/applyProcessManagement";
import command from "../apply";

afterEach(() => {
  vi.clearAllMocks();
});

describe("process apply コマンド", () => {
  it("プロセス管理設定の適用に成功し、成功メッセージが表示される", async () => {
    vi.mocked(applyProcessManagement).mockResolvedValue({
      enableChanged: false,
      newEnable: true,
    });

    await command.run({ values: {} } as never);

    expect(applyProcessManagement).toHaveBeenCalled();
    expect(p.log.success).toHaveBeenCalledWith(
      expect.stringContaining("successfully"),
    );
  });

  it("適用後にデプロイの確認が行われる", async () => {
    vi.mocked(applyProcessManagement).mockResolvedValue({
      enableChanged: false,
      newEnable: true,
    });
    vi.mocked(p.confirm).mockResolvedValue(true);

    await command.run({ values: {} } as never);

    expect(p.confirm).toHaveBeenCalled();
    expect(mockDeploy).toHaveBeenCalled();
  });

  it("デプロイをキャンセルした場合、警告メッセージが表示される", async () => {
    vi.mocked(applyProcessManagement).mockResolvedValue({
      enableChanged: false,
      newEnable: true,
    });
    vi.mocked(p.confirm).mockResolvedValue(false);

    await command.run({ values: {} } as never);

    expect(mockDeploy).not.toHaveBeenCalled();
    expect(p.log.warn).toHaveBeenCalledWith(
      expect.stringContaining("not deployed to production"),
    );
  });

  it("--yes フラグで確認をスキップしてデプロイされる", async () => {
    vi.mocked(applyProcessManagement).mockResolvedValue({
      enableChanged: false,
      newEnable: true,
    });

    await command.run({ values: { yes: true } } as never);

    expect(p.confirm).not.toHaveBeenCalled();
    expect(mockDeploy).toHaveBeenCalled();
  });

  it("enable が変更された場合（有効化）、警告メッセージが表示される", async () => {
    vi.mocked(applyProcessManagement).mockResolvedValue({
      enableChanged: true,
      newEnable: true,
    });

    await command.run({ values: {} } as never);

    expect(p.log.warn).toHaveBeenCalledWith(expect.stringContaining("ENABLED"));
  });

  it("enable が変更された場合（無効化）、警告メッセージが表示される", async () => {
    vi.mocked(applyProcessManagement).mockResolvedValue({
      enableChanged: true,
      newEnable: false,
    });

    await command.run({ values: {} } as never);

    expect(p.log.warn).toHaveBeenCalledWith(
      expect.stringContaining("DISABLED"),
    );
  });

  it("enable が変更されない場合、enable関連の警告は表示されない", async () => {
    vi.mocked(applyProcessManagement).mockResolvedValue({
      enableChanged: false,
      newEnable: true,
    });
    vi.mocked(p.confirm).mockResolvedValue(true);

    await command.run({ values: {} } as never);

    const warnCalls = vi.mocked(p.log.warn).mock.calls;
    const enableWarnings = warnCalls.filter(
      (call) =>
        typeof call[0] === "string" &&
        (call[0].includes("ENABLED") || call[0].includes("DISABLED")),
    );
    expect(enableWarnings).toHaveLength(0);
  });

  it("エラー発生時にhandleCliErrorで処理される", async () => {
    const error = new Error("Process apply failed");
    vi.mocked(applyProcessManagement).mockRejectedValue(error);

    await command.run({ values: {} } as never);

    expect(handleCliError).toHaveBeenCalledWith(error);
  });
});
