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

vi.mock("@/cli/viewConfig", () => ({
  viewArgs: {},
  resolveViewContainerConfig: vi.fn(() => ({
    baseUrl: "https://test.cybozu.com",
    auth: { type: "password", username: "user", password: "pass" },
    appId: "1",
    viewFilePath: "views.yaml",
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
}));

vi.mock("@/core/application/container/viewCli", () => ({
  createViewCliContainer: vi.fn(() => ({})),
}));

vi.mock("@/core/application/view/detectViewDiff");

vi.mock("@/cli/handleError", () => ({
  handleCliError: vi.fn(),
}));

import { handleCliError } from "@/cli/handleError";
import { printViewDiffResult } from "@/cli/output";
import { detectViewDiff } from "@/core/application/view/detectViewDiff";
import command from "../diff";

afterEach(() => {
  vi.clearAllMocks();
});

describe("view diff command", () => {
  it("should detect diff and print result", async () => {
    const mockResult = {
      entries: [
        { type: "added" as const, viewName: "test", details: "new view" },
      ],
      summary: { added: 1, modified: 0, deleted: 0, total: 1 },
      isEmpty: false,
    };
    vi.mocked(detectViewDiff).mockResolvedValue(mockResult);

    await command.run({ values: {} } as never);

    expect(detectViewDiff).toHaveBeenCalled();
    expect(printViewDiffResult).toHaveBeenCalledWith(mockResult);
  });

  it("should print empty result when no diff", async () => {
    const mockResult = {
      entries: [],
      summary: { added: 0, modified: 0, deleted: 0, total: 0 },
      isEmpty: true,
    };
    vi.mocked(detectViewDiff).mockResolvedValue(mockResult);

    await command.run({ values: {} } as never);

    expect(printViewDiffResult).toHaveBeenCalledWith(mockResult);
  });

  it("should handle errors with handleCliError", async () => {
    const error = new Error("Diff failed");
    vi.mocked(detectViewDiff).mockRejectedValue(error);

    await command.run({ values: {} } as never);

    expect(handleCliError).toHaveBeenCalledWith(error);
  });
});
