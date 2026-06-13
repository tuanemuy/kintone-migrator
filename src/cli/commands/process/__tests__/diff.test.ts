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
  printThreeWayDiffResult: vi.fn(),
}));

vi.mock("@/core/application/container/processManagementCli", () => ({
  createProcessManagementCliContainer: vi.fn(() => ({})),
}));

vi.mock(
  "@/core/application/processManagement/detectProcessManagementThreeWayDiff",
);

vi.mock("@/cli/handleError", () => ({
  handleCliError: vi.fn(),
}));

import { handleCliError } from "@/cli/handleError";
import { printThreeWayDiffResult } from "@/cli/output";
import { detectProcessManagementThreeWayDiff } from "@/core/application/processManagement/detectProcessManagementThreeWayDiff";
import command from "../diff";

afterEach(() => {
  vi.clearAllMocks();
});

describe("process diff コマンド", () => {
  it("3-way diff 結果を表示する", async () => {
    const mockResult = {
      mode: "three-way" as const,
      localChanges: [],
      remoteDrift: [],
      conflicts: [],
      extras: [],
      isEmpty: false,
    };
    vi.mocked(detectProcessManagementThreeWayDiff).mockResolvedValue(
      mockResult,
    );

    await command.run({ values: {} } as never);

    expect(detectProcessManagementThreeWayDiff).toHaveBeenCalled();
    expect(printThreeWayDiffResult).toHaveBeenCalledWith(
      mockResult,
      expect.any(Function),
    );
  });

  it("変更なしの場合も結果を表示する", async () => {
    const mockResult = {
      mode: "three-way" as const,
      localChanges: [],
      remoteDrift: [],
      conflicts: [],
      extras: [],
      isEmpty: true,
    };
    vi.mocked(detectProcessManagementThreeWayDiff).mockResolvedValue(
      mockResult,
    );

    await command.run({ values: {} } as never);

    expect(printThreeWayDiffResult).toHaveBeenCalledWith(
      mockResult,
      expect.any(Function),
    );
  });

  it("エラー発生時にhandleCliErrorで処理される", async () => {
    const error = new Error("Diff failed");
    vi.mocked(detectProcessManagementThreeWayDiff).mockRejectedValue(error);

    await command.run({ values: {} } as never);

    expect(handleCliError).toHaveBeenCalledWith(error);
  });
});
