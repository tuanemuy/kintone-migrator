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

vi.mock("../../pushAllOutput", () => ({
  printPushAllResults: vi.fn(),
  pushAllHasFailure: vi.fn(() => false),
}));

vi.mock("@/core/application/container/applyAllCli", () => ({
  createCliApplyAllContainers: vi.fn((config: { appName?: string }) => ({
    // Tag containers with the app name so per-app pushAllForApp calls can be
    // identified by argument and their order asserted.
    containers: { appName: config?.appName },
    paths: { customize: "test-app/customize.yaml" },
  })),
}));

vi.mock("@/core/application/pushAll/pushAllForApp", () => ({
  pushAllForApp: vi.fn(async () => ({ phases: [], deployed: true })),
}));

import * as p from "@clack/prompts";
import { pushAllForApp } from "@/core/application/pushAll/pushAllForApp";
import type {
  AppEntry,
  ExecutionPlan,
  ProjectConfig,
} from "@/core/domain/projectConfig/entity";
import type { AppName } from "@/core/domain/projectConfig/valueObject";
import { handleCliError } from "../../handleError";
import { printAppHeader } from "../../output";
import { routeMultiApp, runMultiAppWithFailCheck } from "../../projectConfig";
import { printPushAllResults, pushAllHasFailure } from "../../pushAllOutput";
import pushCommand from "../push";

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

describe("push command (top-level dispatcher)", () => {
  it("singleLegacy ではエラーを表示し exitCode を 1 にすること", async () => {
    await pushCommand.run({ values: {} } as never);

    expect(p.log.error).toHaveBeenCalledWith(
      expect.stringContaining("requires a project config file"),
    );
    expect(process.exitCode).toBe(1);
    expect(pushAllForApp).not.toHaveBeenCalled();
  });

  it("singleApp では確認後に pushAllForApp と printPushAllResults が呼ばれること", async () => {
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
    vi.mocked(p.confirm).mockResolvedValueOnce(true);

    await pushCommand.run({ values: {} } as never);

    expect(p.confirm).toHaveBeenCalledTimes(1);
    expect(pushAllForApp).toHaveBeenCalled();
    expect(printPushAllResults).toHaveBeenCalled();
    expect(process.exitCode).toBeUndefined();
  });

  it("singleApp で --yes のときは確認プロンプトをスキップすること", async () => {
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

    await pushCommand.run({ values: { yes: true } } as never);

    expect(p.confirm).not.toHaveBeenCalled();
    expect(pushAllForApp).toHaveBeenCalled();
  });

  it("singleApp で確認をキャンセルしたら push されないこと", async () => {
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
    vi.mocked(p.confirm).mockResolvedValueOnce(false);

    await pushCommand.run({ values: {} } as never);

    expect(p.cancel).toHaveBeenCalled();
    expect(pushAllForApp).not.toHaveBeenCalled();
  });

  it("multiApp では confirm は1回だけ・全アプリが per-app に依存順で push/deploy されること（AC-14）", async () => {
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
    vi.mocked(p.confirm).mockResolvedValueOnce(true);
    // Per-app push + deploy stays inside pushAllForApp, driven per app by
    // runMultiAppWithFailCheck (mirrors apply.ts).
    vi.mocked(runMultiAppWithFailCheck).mockImplementationOnce(
      async (_plan, executor) => {
        for (const app of plan.orderedApps) {
          await executor(app);
        }
      },
    );

    await pushCommand.run({ values: {} } as never);

    expect(p.confirm).toHaveBeenCalledTimes(1);
    expect(runMultiAppWithFailCheck).toHaveBeenCalled();
    expect(pushAllForApp).toHaveBeenCalledTimes(2);
    expect(printAppHeader).toHaveBeenCalledWith("test-app", "123");
    expect(printAppHeader).toHaveBeenCalledWith("test-app-2", "456");

    const pushedOrder = vi
      .mocked(pushAllForApp)
      .mock.calls.map(
        ([arg]) => (arg.containers as { appName?: string }).appName,
      );
    expect(pushedOrder).toEqual(["test-app", "test-app-2"]);
  });

  it("multiApp で confirm をキャンセルしたら push されないこと", async () => {
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
    vi.mocked(p.confirm).mockResolvedValueOnce(false);

    await pushCommand.run({ values: {} } as never);

    expect(p.cancel).toHaveBeenCalled();
    expect(runMultiAppWithFailCheck).not.toHaveBeenCalled();
    expect(pushAllForApp).not.toHaveBeenCalled();
  });

  it("--force フラグが pushAllForApp に伝播すること", async () => {
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

    await pushCommand.run({ values: { yes: true, force: true } } as never);

    expect(pushAllForApp).toHaveBeenCalledWith(
      expect.objectContaining({ force: true }),
    );
  });

  it("singleApp で push に失敗があれば exitCode を 1 にすること", async () => {
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
    vi.mocked(p.confirm).mockResolvedValueOnce(true);
    vi.mocked(pushAllHasFailure).mockReturnValueOnce(true);

    await pushCommand.run({ values: {} } as never);

    expect(process.exitCode).toBe(1);
  });

  it("エラー発生時に handleCliError が呼ばれること", async () => {
    const testError = new Error("boom");
    vi.mocked(routeMultiApp).mockRejectedValueOnce(testError);

    await pushCommand.run({ values: {} } as never);

    expect(handleCliError).toHaveBeenCalledWith(testError);
  });
});
