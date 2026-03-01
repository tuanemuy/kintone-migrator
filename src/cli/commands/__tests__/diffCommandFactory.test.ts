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
import type {
  AppEntry,
  ProjectConfig,
} from "@/core/domain/projectConfig/entity";
import type { AppName } from "@/core/domain/projectConfig/valueObject";
import { routeMultiApp, runMultiAppWithFailCheck } from "../../projectConfig";
import { createDiffCommand } from "../diffCommandFactory";

afterEach(() => {
  vi.clearAllMocks();
});

const mockApp: AppEntry = {
  name: "test-app" as AppName,
  appId: "123",
  dependsOn: [],
};

const mockProjectConfig: ProjectConfig = {
  domain: "example.kintone.com",
  apps: new Map([["test-app" as AppName, mockApp]]),
};

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
    warnings: [],
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

  it("should call resolveAppContainerConfig and createContainer in singleApp path", async () => {
    vi.mocked(routeMultiApp).mockImplementationOnce(
      async (
        _values: unknown,
        handlers: {
          singleApp: (app: AppEntry, config: ProjectConfig) => Promise<void>;
        },
      ) => {
        await handlers.singleApp(mockApp, mockProjectConfig);
      },
    );

    const diffResult = makeResult([{ type: "added", name: "field1" }]);
    const detectDiff = vi.fn().mockResolvedValue(diffResult);
    const printResult = vi.fn();
    const createContainer = vi.fn((config: string) => ({ config }));
    const resolveAppContainerConfig = vi.fn(() => "app-container-config");

    const command = createDiffCommand({
      description: "Test diff",
      args: {},
      spinnerMessage: "Testing...",
      createContainer,
      detectDiff,
      printResult,
      resolveContainerConfig: () => "legacy-config",
      resolveAppContainerConfig,
    });

    await command.run({ values: {} } as never);

    expect(resolveAppContainerConfig).toHaveBeenCalledWith(
      mockApp,
      mockProjectConfig,
      {},
    );
    expect(createContainer).toHaveBeenCalledWith("app-container-config");
    expect(detectDiff).toHaveBeenCalled();
    expect(printResult).toHaveBeenCalledWith(diffResult);
  });

  it("should call resolveAppContainerConfig and createContainer in multiApp path", async () => {
    const plan = { orderedApps: [mockApp] };

    vi.mocked(routeMultiApp).mockImplementationOnce(
      async (
        _values: unknown,
        handlers: {
          multiApp: (
            plan: { orderedApps: readonly AppEntry[] },
            config: ProjectConfig,
          ) => Promise<void>;
        },
      ) => {
        await handlers.multiApp(plan, mockProjectConfig);
      },
    );

    vi.mocked(runMultiAppWithFailCheck).mockImplementationOnce(
      async (_plan, executor) => {
        await executor(mockApp);
      },
    );

    const diffResult = makeResult([{ type: "modified", name: "field2" }]);
    const detectDiff = vi.fn().mockResolvedValue(diffResult);
    const printResult = vi.fn();
    const createContainer = vi.fn((config: string) => ({ config }));
    const resolveAppContainerConfig = vi.fn(() => "app-container-config");

    const command = createDiffCommand({
      description: "Test diff",
      args: {},
      spinnerMessage: "Testing...",
      createContainer,
      detectDiff,
      printResult,
      resolveContainerConfig: () => "legacy-config",
      resolveAppContainerConfig,
    });

    await command.run({ values: {} } as never);

    expect(resolveAppContainerConfig).toHaveBeenCalledWith(
      mockApp,
      mockProjectConfig,
      {},
    );
    expect(createContainer).toHaveBeenCalledWith("app-container-config");
    expect(detectDiff).toHaveBeenCalled();
    expect(printResult).toHaveBeenCalledWith(diffResult);
  });

  it("should pass multiAppSuccessMessage to runMultiAppWithFailCheck", async () => {
    const plan = { orderedApps: [mockApp] };

    vi.mocked(routeMultiApp).mockImplementationOnce(
      async (
        _values: unknown,
        handlers: {
          multiApp: (
            plan: { orderedApps: readonly AppEntry[] },
            config: ProjectConfig,
          ) => Promise<void>;
        },
      ) => {
        await handlers.multiApp(plan, mockProjectConfig);
      },
    );

    vi.mocked(runMultiAppWithFailCheck).mockImplementationOnce(async () => {});

    const diffResult = makeResult([]);
    const detectDiff = vi.fn().mockResolvedValue(diffResult);

    const command = createDiffCommand({
      description: "Test diff",
      args: {},
      spinnerMessage: "Testing...",
      multiAppSuccessMessage: "All diffs completed!",
      createContainer: (config: string) => ({ config }),
      detectDiff,
      printResult: vi.fn(),
      resolveContainerConfig: () => "test-config",
      resolveAppContainerConfig: () => "test-config",
    });

    await command.run({ values: {} } as never);

    expect(runMultiAppWithFailCheck).toHaveBeenCalledWith(
      plan,
      expect.any(Function),
      "All diffs completed!",
    );
  });
});
