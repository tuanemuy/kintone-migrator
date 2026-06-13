import { afterEach, describe, expect, it, vi } from "vitest";
import type { DetectViewThreeWayDiffOutput } from "@/core/application/view/detectViewThreeWayDiff";

vi.mock("@clack/prompts", () => ({
  spinner: vi.fn(() => ({ start: vi.fn(), stop: vi.fn() })),
  log: {
    info: vi.fn(),
    success: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
  outro: vi.fn(),
  note: vi.fn(),
}));

vi.mock("@/cli/viewConfig", () => ({
  viewArgs: {},
  resolveViewContainerConfig: vi.fn(() => ({
    baseUrl: "https://test.cybozu.com",
    auth: { type: "password", username: "user", password: "pass" },
    appId: "1",
    viewFilePath: "views.yaml",
    viewStateFilePath: "state/view.yaml",
    appRevisionFilePath: "state/revision.yaml",
  })),
  resolveViewAppContainerConfig: vi.fn(),
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
  printViewDiffResult: vi.fn(),
  printThreeWayDiffResult: vi.fn(),
}));

vi.mock("@/core/application/container/viewCli", () => ({
  createViewCliContainer: vi.fn(() => ({})),
}));

vi.mock("@/core/application/view/detectViewThreeWayDiff");

vi.mock("@/cli/handleError", () => ({
  handleCliError: vi.fn(),
}));

import { handleCliError } from "@/cli/handleError";
import { printThreeWayDiffResult } from "@/cli/output";
import { detectViewThreeWayDiff } from "@/core/application/view/detectViewThreeWayDiff";
import command from "../diff";

afterEach(() => {
  vi.clearAllMocks();
});

function twoWayResult(): DetectViewThreeWayDiffOutput {
  return {
    mode: "two-way",
    diff: {
      entries: [],
      summary: { added: 0, modified: 0, deleted: 0, total: 0 },
      isEmpty: true,
      warnings: [],
    },
  };
}

function threeWayResult(): DetectViewThreeWayDiffOutput {
  return {
    mode: "three-way",
    localChanges: [{ key: "一覧", label: "LIST", kind: "localOnly" }],
    remoteDrift: [],
    conflicts: [],
    extras: [],
    isEmpty: false,
  };
}

describe("view diff command", () => {
  it("passes the two-way result to the printer when no state exists", async () => {
    const mockResult = twoWayResult();
    vi.mocked(detectViewThreeWayDiff).mockResolvedValue(mockResult);

    await command.run({ values: {} } as never);

    expect(detectViewThreeWayDiff).toHaveBeenCalled();
    expect(printThreeWayDiffResult).toHaveBeenCalledWith(
      mockResult,
      expect.any(Function),
    );
  });

  it("passes the three-way result to the printer when state exists", async () => {
    const mockResult = threeWayResult();
    vi.mocked(detectViewThreeWayDiff).mockResolvedValue(mockResult);

    await command.run({ values: {} } as never);

    expect(printThreeWayDiffResult).toHaveBeenCalledWith(
      mockResult,
      expect.any(Function),
    );
  });

  it("should handle errors with handleCliError", async () => {
    const error = new Error("Diff failed");
    vi.mocked(detectViewThreeWayDiff).mockRejectedValue(error);

    await command.run({ values: {} } as never);

    expect(handleCliError).toHaveBeenCalledWith(error);
  });
});
