import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@clack/prompts", () => ({
  spinner: vi.fn(() => ({
    start: vi.fn(),
    stop: vi.fn(),
  })),
  log: {
    info: vi.fn(),
    warn: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    step: vi.fn(),
  },
  note: vi.fn(),
}));

vi.mock("../../handleError", () => ({
  handleCliError: vi.fn(),
}));

vi.mock("../../projectConfig", () => ({
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

vi.mock("../../output", () => ({
  printAppHeader: vi.fn(),
}));

import * as p from "@clack/prompts";
import type { DiffResult } from "@/core/domain/diff";
import { createDiffCommand } from "../diffCommandFactory";

afterEach(() => {
  vi.clearAllMocks();
});

type TestEntry = { type: "added" | "modified" | "deleted"; name: string };

function makeResult(entries: TestEntry[]): DiffResult<TestEntry> {
  return {
    entries,
    summary: {
      added: entries.filter((e) => e.type === "added").length,
      modified: entries.filter((e) => e.type === "modified").length,
      deleted: entries.filter((e) => e.type === "deleted").length,
      total: entries.length,
    },
    isEmpty: entries.length === 0,
  };
}

describe("createDiffCommand", () => {
  it("should call printResult with the diff result on success", async () => {
    const diffResult = makeResult([{ type: "added", name: "test" }]);
    const printResult = vi.fn();
    const detectDiff = vi.fn().mockResolvedValue(diffResult);

    const command = createDiffCommand({
      description: "Test diff",
      args: {},
      spinnerMessage: "Testing...",
      createContainer: (config: string) => ({ config }),
      detectDiff,
      printResult,
      resolveContainerConfig: () => "test-config",
      resolveAppContainerConfig: () => "test-config",
    });

    await command.run({ values: {} } as never);

    expect(detectDiff).toHaveBeenCalled();
    expect(printResult).toHaveBeenCalledWith(diffResult);
  });

  it("should stop spinner with failure message on error", async () => {
    const detectDiff = vi.fn().mockRejectedValue(new Error("test error"));
    const printResult = vi.fn();

    const command = createDiffCommand({
      description: "Test diff",
      args: {},
      spinnerMessage: "Testing...",
      createContainer: (config: string) => ({ config }),
      detectDiff,
      printResult,
      resolveContainerConfig: () => "test-config",
      resolveAppContainerConfig: () => "test-config",
    });

    await command.run({ values: {} } as never);

    const spinnerInstance = vi.mocked(p.spinner).mock.results[0].value as {
      start: ReturnType<typeof vi.fn>;
      stop: ReturnType<typeof vi.fn>;
    };
    expect(spinnerInstance.stop).toHaveBeenCalledWith("Comparison failed.");
    expect(printResult).not.toHaveBeenCalled();
  });

  it("should start spinner with configured message", async () => {
    const diffResult = makeResult([]);
    const detectDiff = vi.fn().mockResolvedValue(diffResult);

    const command = createDiffCommand({
      description: "Test diff",
      args: {},
      spinnerMessage: "Custom spinner...",
      createContainer: (config: string) => ({ config }),
      detectDiff,
      printResult: vi.fn(),
      resolveContainerConfig: () => "test-config",
      resolveAppContainerConfig: () => "test-config",
    });

    await command.run({ values: {} } as never);

    const spinnerInstance = vi.mocked(p.spinner).mock.results[0].value as {
      start: ReturnType<typeof vi.fn>;
      stop: ReturnType<typeof vi.fn>;
    };
    expect(spinnerInstance.start).toHaveBeenCalledWith("Custom spinner...");
    expect(spinnerInstance.stop).toHaveBeenCalledWith("Comparison complete.");
  });
});
