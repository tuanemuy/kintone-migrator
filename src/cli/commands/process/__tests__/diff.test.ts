import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@clack/prompts", () => ({
  spinner: vi.fn(() => ({ start: vi.fn(), stop: vi.fn() })),
  log: {
    info: vi.fn(),
    success: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
  note: vi.fn(),
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
  printProcessDiffResult: vi.fn(),
}));

vi.mock("@/core/application/container/processManagementCli", () => ({
  createProcessManagementCliContainer: vi.fn(() => ({})),
}));

vi.mock("@/core/application/processManagement/detectProcessManagementDiff");

vi.mock("@/cli/handleError", () => ({
  handleCliError: vi.fn(),
}));

import { handleCliError } from "@/cli/handleError";
import { printProcessDiffResult } from "@/cli/output";
import { detectProcessManagementDiff } from "@/core/application/processManagement/detectProcessManagementDiff";
import command from "../diff";

afterEach(() => {
  vi.clearAllMocks();
});

describe("process diff コマンド", () => {
  it("diff 結果を表示する", async () => {
    const mockResult = {
      entries: [
        {
          type: "added" as const,
          category: "state" as const,
          name: "処理中",
          details: "assignee: ALL",
        },
      ],
      isEmpty: false,
      summary: { added: 1, modified: 0, deleted: 0, total: 1 },
      warnings: [],
    };
    vi.mocked(detectProcessManagementDiff).mockResolvedValue(mockResult);

    await command.run({ values: {} } as never);

    expect(detectProcessManagementDiff).toHaveBeenCalled();
    expect(printProcessDiffResult).toHaveBeenCalledWith(mockResult);
  });

  it("変更なしの場合も結果を表示する", async () => {
    const mockResult = {
      entries: [],
      isEmpty: true,
      summary: { added: 0, modified: 0, deleted: 0, total: 0 },
      warnings: [],
    };
    vi.mocked(detectProcessManagementDiff).mockResolvedValue(mockResult);

    await command.run({ values: {} } as never);

    expect(printProcessDiffResult).toHaveBeenCalledWith(mockResult);
  });

  it("エラー発生時にhandleCliErrorで処理される", async () => {
    const error = new Error("Diff failed");
    vi.mocked(detectProcessManagementDiff).mockRejectedValue(error);

    await command.run({ values: {} } as never);

    expect(handleCliError).toHaveBeenCalledWith(error);
  });
});
