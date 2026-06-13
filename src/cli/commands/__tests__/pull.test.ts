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
    message: vi.fn(),
  },
  note: vi.fn(),
  confirm: vi.fn(),
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
  resolveAppCliConfig: vi.fn(() => ({
    baseUrl: "https://example.kintone.com",
    auth: { type: "apiToken", apiToken: "test-token" },
    appId: "123",
  })),
  runMultiAppWithFailCheck: vi.fn(),
}));

vi.mock("../../output", () => ({
  printAppHeader: vi.fn(),
}));

vi.mock("../../pullAllOutput", () => ({
  printPullAllResults: vi.fn(),
  pullAllHasFailure: vi.fn(() => false),
}));

vi.mock("@/core/application/container/applyAllCli", () => ({
  createCliApplyAllContainers: vi.fn((config: { appName?: string }) => ({
    // Tag containers with the app name so per-app pullAllForApp calls can be
    // identified by argument and their order asserted.
    containers: { appName: config?.appName },
    paths: { customize: "test-app/customize.yaml" },
  })),
}));

vi.mock("@/core/application/pullAll/pullAllForApp", () => ({
  pullAllForApp: vi.fn(async () => ({ revisionSkip: false, results: [] })),
}));

import * as p from "@clack/prompts";
import { pullAllForApp } from "@/core/application/pullAll/pullAllForApp";
import type {
  AppEntry,
  ExecutionPlan,
  ProjectConfig,
} from "@/core/domain/projectConfig/entity";
import type { AppName } from "@/core/domain/projectConfig/valueObject";
import { handleCliError } from "../../handleError";
import { printAppHeader } from "../../output";
import { routeMultiApp, runMultiAppWithFailCheck } from "../../projectConfig";
import { printPullAllResults, pullAllHasFailure } from "../../pullAllOutput";
import pullCommand from "../pull";

afterEach(() => {
  vi.clearAllMocks();
  process.exitCode = undefined;
});

const mockApp: AppEntry = {
  name: "test-app" as AppName,
  appId: "123",
  dependsOn: [],
};

const mockApp2: AppEntry = {
  name: "test-app-2" as AppName,
  appId: "456",
  dependsOn: ["test-app" as AppName],
};

const mockProjectConfig: ProjectConfig = {
  domain: "example.kintone.com",
  apps: new Map([["test-app" as AppName, mockApp]]),
};

const mockMultiProjectConfig: ProjectConfig = {
  domain: "example.kintone.com",
  apps: new Map([
    ["test-app" as AppName, mockApp],
    ["test-app-2" as AppName, mockApp2],
  ]),
};

describe("pull command (top-level dispatcher)", () => {
  it("singleLegacy ではエラーを表示し exitCode を 1 にすること", async () => {
    await pullCommand.run({ values: {} } as never);

    expect(p.log.error).toHaveBeenCalledWith(
      expect.stringContaining("requires a project config file"),
    );
    expect(process.exitCode).toBe(1);
    expect(pullAllForApp).not.toHaveBeenCalled();
  });

  it("singleApp では pullAllForApp と printPullAllResults が呼ばれること", async () => {
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

    await pullCommand.run({ values: {} } as never);

    expect(pullAllForApp).toHaveBeenCalled();
    expect(printPullAllResults).toHaveBeenCalled();
    expect(process.exitCode).toBeUndefined();
  });

  it("--ours と --theirs を同時指定するとエラーになり pull しないこと", async () => {
    await pullCommand.run({ values: { ours: true, theirs: true } } as never);

    expect(handleCliError).toHaveBeenCalled();
    expect(pullAllForApp).not.toHaveBeenCalled();
  });

  it("multiApp では全ドメインが per-app に依存順で pull され printAppHeader が表示されること", async () => {
    const plan: ExecutionPlan = { orderedApps: [mockApp, mockApp2] };

    vi.mocked(routeMultiApp).mockImplementationOnce(
      async (
        _values: unknown,
        handlers: {
          multiApp: (
            plan: ExecutionPlan,
            config: ProjectConfig,
          ) => Promise<void>;
        },
      ) => {
        await handlers.multiApp(plan, mockMultiProjectConfig);
      },
    );
    vi.mocked(runMultiAppWithFailCheck).mockImplementationOnce(
      async (_plan, executor) => {
        for (const app of plan.orderedApps) {
          await executor(app);
        }
      },
    );

    await pullCommand.run({ values: {} } as never);

    expect(runMultiAppWithFailCheck).toHaveBeenCalled();
    expect(pullAllForApp).toHaveBeenCalledTimes(2);
    expect(printAppHeader).toHaveBeenCalledWith("test-app", "123");
    expect(printAppHeader).toHaveBeenCalledWith("test-app-2", "456");

    // Per-app pulls run in dependency order (containers tagged with app name).
    const pulledOrder = vi
      .mocked(pullAllForApp)
      .mock.calls.map(
        ([arg]) => (arg.containers as { appName?: string }).appName,
      );
    expect(pulledOrder).toEqual(["test-app", "test-app-2"]);
  });

  it("multiApp の --ours/--theirs フラグが pullAllForApp に伝播すること", async () => {
    const plan: ExecutionPlan = { orderedApps: [mockApp] };

    vi.mocked(routeMultiApp).mockImplementationOnce(
      async (
        _values: unknown,
        handlers: {
          multiApp: (
            plan: ExecutionPlan,
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

    await pullCommand.run({ values: { theirs: true } } as never);

    expect(pullAllForApp).toHaveBeenCalledWith(
      expect.objectContaining({ ours: false, theirs: true }),
    );
  });

  it("singleApp で pull に失敗があれば exitCode を 1 にすること", async () => {
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
    vi.mocked(pullAllHasFailure).mockReturnValueOnce(true);

    await pullCommand.run({ values: {} } as never);

    expect(process.exitCode).toBe(1);
  });

  it("エラー発生時に handleCliError が呼ばれること", async () => {
    const testError = new Error("boom");
    vi.mocked(routeMultiApp).mockRejectedValueOnce(testError);

    await pullCommand.run({ values: {} } as never);

    expect(handleCliError).toHaveBeenCalledWith(testError);
  });
});
