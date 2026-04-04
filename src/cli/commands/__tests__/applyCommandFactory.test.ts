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
  confirm: vi.fn(() => true),
  isCancel: vi.fn(() => false),
  cancel: vi.fn(),
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
  runMultiAppWithHeaders: vi.fn(),
}));

vi.mock("../../output", () => ({
  printAppHeader: vi.fn(),
  confirmAndDeploy: vi.fn(),
}));

import * as p from "@clack/prompts";
import type { DiffResult } from "@/core/domain/diff";
import type {
  AppEntry,
  ProjectConfig,
} from "@/core/domain/projectConfig/entity";
import type { AppName } from "@/core/domain/projectConfig/valueObject";
import { handleCliError } from "../../handleError";
import { confirmAndDeploy, printAppHeader } from "../../output";
import { routeMultiApp, runMultiAppWithHeaders } from "../../projectConfig";
import { createApplyCommand } from "../applyCommandFactory";

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

function makeDiffResult(entries: TestEntry[]): DiffResult<TestEntry> {
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

const mockDeploy = vi.fn();

type TestContainer = {
  config: string;
  appDeployer: { deploy: ReturnType<typeof vi.fn> };
};

function makeConfig(
  overrides: {
    diffPreview?: {
      detectDiff: (args: {
        container: TestContainer;
      }) => Promise<DiffResult<{ type: "added" | "modified" | "deleted" }>>;
      printResult: (result: DiffResult<any>) => void;
    };
  } = {},
) {
  return {
    description: "Test apply",
    args: {} as Record<string, never>,
    spinnerMessage: "Applying...",
    spinnerStopMessage: "Applied.",
    successMessage: "Applied successfully.",
    createContainer: vi.fn((config: string) => ({
      config,
      appDeployer: { deploy: mockDeploy },
    })),
    applyFn: vi.fn().mockResolvedValue(undefined) as (args: {
      container: TestContainer;
    }) => Promise<void>,
    resolveContainerConfig: vi.fn(() => "test-config"),
    resolveAppContainerConfig: vi.fn(() => "app-config"),
    ...overrides,
  };
}

describe("createApplyCommand", () => {
  describe("without diffPreview (backward compatibility)", () => {
    it("should apply directly without diff detection", async () => {
      const config = makeConfig();
      const command = createApplyCommand(config);

      await command.run({ values: {} } as never);

      expect(config.applyFn).toHaveBeenCalled();
      expect(confirmAndDeploy).toHaveBeenCalled();
    });

    it("should call onResult when provided", async () => {
      const onResult = vi.fn();
      const config = makeConfig();
      const command = createApplyCommand({ ...config, onResult });

      await command.run({ values: {} } as never);

      expect(onResult).toHaveBeenCalled();
    });
  });

  describe("with diffPreview", () => {
    it("should detect diff before applying", async () => {
      const diffResult = makeDiffResult([{ type: "added", name: "test" }]);
      const detectDiff = vi.fn().mockResolvedValue(diffResult);
      const printResult = vi.fn();
      const config = makeConfig({
        diffPreview: { detectDiff, printResult },
      });
      const command = createApplyCommand(config);

      await command.run({ values: { yes: true } } as never);

      expect(detectDiff).toHaveBeenCalled();
      expect(printResult).toHaveBeenCalledWith(diffResult);
      expect(config.applyFn).toHaveBeenCalled();
    });

    it("should skip apply when diff is empty", async () => {
      const diffResult = makeDiffResult([]);
      const detectDiff = vi.fn().mockResolvedValue(diffResult);
      const printResult = vi.fn();
      const config = makeConfig({
        diffPreview: { detectDiff, printResult },
      });
      const command = createApplyCommand(config);

      await command.run({ values: {} } as never);

      expect(detectDiff).toHaveBeenCalled();
      expect(printResult).toHaveBeenCalledWith(diffResult);
      expect(p.log.success).toHaveBeenCalledWith("No changes detected.");
      expect(config.applyFn).not.toHaveBeenCalled();
      expect(confirmAndDeploy).not.toHaveBeenCalled();
    });

    it("should show confirmation prompt when diff has changes", async () => {
      const diffResult = makeDiffResult([{ type: "modified", name: "test" }]);
      const detectDiff = vi.fn().mockResolvedValue(diffResult);
      const printResult = vi.fn();
      const config = makeConfig({
        diffPreview: { detectDiff, printResult },
      });
      vi.mocked(p.confirm).mockResolvedValue(true);
      const command = createApplyCommand(config);

      await command.run({ values: {} } as never);

      expect(p.confirm).toHaveBeenCalledWith(
        expect.objectContaining({ message: "Apply these changes?" }),
      );
      expect(config.applyFn).toHaveBeenCalled();
    });

    it("should cancel when user declines confirmation", async () => {
      const diffResult = makeDiffResult([{ type: "modified", name: "test" }]);
      const detectDiff = vi.fn().mockResolvedValue(diffResult);
      const printResult = vi.fn();
      const config = makeConfig({
        diffPreview: { detectDiff, printResult },
      });
      vi.mocked(p.confirm).mockResolvedValue(false);
      const command = createApplyCommand(config);

      await command.run({ values: {} } as never);

      expect(p.cancel).toHaveBeenCalledWith("Apply cancelled.");
      expect(config.applyFn).not.toHaveBeenCalled();
      expect(confirmAndDeploy).not.toHaveBeenCalled();
    });

    it("should skip confirmation prompt with --yes flag", async () => {
      const diffResult = makeDiffResult([{ type: "added", name: "test" }]);
      const detectDiff = vi.fn().mockResolvedValue(diffResult);
      const printResult = vi.fn();
      const config = makeConfig({
        diffPreview: { detectDiff, printResult },
      });
      const command = createApplyCommand(config);

      await command.run({ values: { yes: true } } as never);

      // p.confirm should only be called by confirmAndDeploy (mocked), not by the diff flow
      expect(config.applyFn).toHaveBeenCalled();
      expect(confirmAndDeploy).toHaveBeenCalled();
    });

    it("should handle detectDiff error and stop spinner", async () => {
      const error = new Error("diff detection failed");
      const detectDiff = vi.fn().mockRejectedValue(error);
      const printResult = vi.fn();
      const config = makeConfig({
        diffPreview: { detectDiff, printResult },
      });
      const command = createApplyCommand(config);

      await command.run({ values: {} } as never);

      const spinnerInstance = vi.mocked(p.spinner).mock.results[0].value as {
        start: ReturnType<typeof vi.fn>;
        stop: ReturnType<typeof vi.fn>;
      };
      expect(spinnerInstance.stop).toHaveBeenCalledWith("Comparison failed.");
      expect(printResult).not.toHaveBeenCalled();
      expect(config.applyFn).not.toHaveBeenCalled();
      expect(handleCliError).toHaveBeenCalledWith(error);
    });

    it("should reuse container from diff preview in apply", async () => {
      const diffResult = makeDiffResult([{ type: "added", name: "test" }]);
      const detectDiff = vi.fn().mockResolvedValue(diffResult);
      const printResult = vi.fn();
      const config = makeConfig({
        diffPreview: { detectDiff, printResult },
      });
      const command = createApplyCommand(config);

      await command.run({ values: { yes: true } } as never);

      // createContainer should be called once (for diff), not twice
      expect(config.createContainer).toHaveBeenCalledTimes(1);
    });
  });

  describe("with diffPreview in singleApp path", () => {
    it("should detect diff and apply in singleApp path", async () => {
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

      const diffResult = makeDiffResult([{ type: "added", name: "test" }]);
      const detectDiff = vi.fn().mockResolvedValue(diffResult);
      const printResult = vi.fn();
      const config = makeConfig({
        diffPreview: { detectDiff, printResult },
      });
      const command = createApplyCommand(config);

      await command.run({ values: { yes: true } } as never);

      expect(detectDiff).toHaveBeenCalled();
      expect(config.applyFn).toHaveBeenCalled();
      expect(confirmAndDeploy).toHaveBeenCalled();
    });
  });

  describe("with diffPreview in multiApp path", () => {
    it("should detect diff for all apps then apply changed ones", async () => {
      const mockApp2: AppEntry = {
        name: "test-app-2" as AppName,
        appId: "456",
        dependsOn: [],
      };
      const plan = { orderedApps: [mockApp, mockApp2] };

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

      const diffResultWithChanges = makeDiffResult([
        { type: "added", name: "test" },
      ]);
      const diffResultEmpty = makeDiffResult([]);

      const detectDiff = vi
        .fn()
        .mockResolvedValueOnce(diffResultWithChanges)
        .mockResolvedValueOnce(diffResultEmpty);
      const printResult = vi.fn();
      const config = makeConfig({
        diffPreview: { detectDiff, printResult },
      });

      vi.mocked(runMultiAppWithHeaders).mockImplementationOnce(
        async (_plan, executor) => {
          await executor(mockApp);
          await executor(mockApp2);
        },
      );

      const command = createApplyCommand(config);
      await command.run({ values: { yes: true } } as never);

      // Phase 1: Diff detected for both apps
      expect(detectDiff).toHaveBeenCalledTimes(2);
      expect(printAppHeader).toHaveBeenCalledTimes(2);

      // Phase 4: Only app with changes gets applied
      expect(config.applyFn).toHaveBeenCalledTimes(1);

      // Phase 5: Deploy
      expect(confirmAndDeploy).toHaveBeenCalled();
    });

    it("should skip apply when no apps have changes", async () => {
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

      const diffResult = makeDiffResult([]);
      const detectDiff = vi.fn().mockResolvedValue(diffResult);
      const printResult = vi.fn();
      const config = makeConfig({
        diffPreview: { detectDiff, printResult },
      });
      const command = createApplyCommand(config);

      await command.run({ values: {} } as never);

      expect(p.log.success).toHaveBeenCalledWith(
        "No changes detected in any app.",
      );
      expect(config.applyFn).not.toHaveBeenCalled();
      expect(confirmAndDeploy).not.toHaveBeenCalled();
    });

    it("should show confirmation in multiApp path", async () => {
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

      const diffResult = makeDiffResult([{ type: "added", name: "test" }]);
      const detectDiff = vi.fn().mockResolvedValue(diffResult);
      const printResult = vi.fn();
      const config = makeConfig({
        diffPreview: { detectDiff, printResult },
      });

      vi.mocked(p.confirm).mockResolvedValue(false);

      const command = createApplyCommand(config);
      await command.run({ values: {} } as never);

      expect(p.confirm).toHaveBeenCalledWith(
        expect.objectContaining({
          message: "Apply these changes to all apps?",
        }),
      );
      expect(p.cancel).toHaveBeenCalledWith("Apply cancelled.");
      expect(config.applyFn).not.toHaveBeenCalled();
    });
  });
});
