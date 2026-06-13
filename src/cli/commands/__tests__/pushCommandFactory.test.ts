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

import {
  ConflictError,
  ConflictErrorCode,
  isConflictError,
} from "@/core/application/error";
import type {
  AppEntry,
  ProjectConfig,
} from "@/core/domain/projectConfig/entity";
import type { AppName } from "@/core/domain/projectConfig/valueObject";
import { handleCliError } from "../../handleError";
import { confirmAndDeploy } from "../../output";
import { routeMultiApp } from "../../projectConfig";
import { createPushCommand } from "../pushCommandFactory";

afterEach(() => {
  vi.clearAllMocks();
});

const mockApp: AppEntry = {
  name: "test-app" as AppName,
  appId: "123",
  dependsOn: [],
};

const mockApp2: AppEntry = {
  name: "test-app-2" as AppName,
  appId: "456",
  dependsOn: [],
};

const mockProjectConfig: ProjectConfig = {
  domain: "example.kintone.com",
  apps: new Map([
    ["test-app" as AppName, mockApp],
    ["test-app-2" as AppName, mockApp2],
  ]),
};

const mockDeploy = vi.fn();

type TestContainer = {
  appName: string;
  appDeployer: { deploy: ReturnType<typeof vi.fn> };
};

function makeConfig(
  overrides: Partial<Parameters<typeof createPushCommand>[0]> = {},
) {
  return {
    description: "Push test config",
    args: {} as Record<string, never>,
    subject: "test config",
    spinnerStopMessage: "Test config pushed.",
    toctouMessage: "Remote changed. Run `test pull` first.",
    createContainer: vi.fn((config: string) => ({
      appName: config,
      appDeployer: { deploy: mockDeploy },
    })),
    pushFn: vi.fn().mockResolvedValue({}),
    // Tag the container config with the app name so per-app deploy order can be
    // asserted from the createContainer arguments.
    resolveContainerConfig: vi.fn(() => "legacy-app"),
    resolveAppContainerConfig: vi.fn((app: AppEntry) => app.name),
    ...overrides,
  } as Parameters<typeof createPushCommand>[0];
}

describe("createPushCommand — singleApp route (CLI per-app deploy)", () => {
  it("runs the push usecase and deploys per app (confirmAndDeploy) on the singleApp route", async () => {
    // The all-command tests fix routeMultiApp to singleLegacy; this exercises the
    // singleApp branch so the factory's CLI-layer per-app deploy is run.
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

    const config = makeConfig();
    const command = createPushCommand(config);

    await command.run({ values: { yes: true } } as never);

    expect(config.resolveAppContainerConfig).toHaveBeenCalled();
    expect(config.pushFn).toHaveBeenCalled();
    // Per-app deploy: confirmAndDeploy is called with the app's own container.
    expect(confirmAndDeploy).toHaveBeenCalledTimes(1);
    const [containers] = vi.mocked(confirmAndDeploy).mock.calls[0];
    expect((containers[0] as unknown as TestContainer).appName).toBe(
      "test-app",
    );
    expect(handleCliError).not.toHaveBeenCalled();
  });

  it("surfaces snapshot drift (ConfigDrift) as-is and skips deploy on the singleApp route", async () => {
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

    const drift = new ConflictError(ConflictErrorCode.ConfigDrift, "drift");
    const config = makeConfig({
      pushFn: vi.fn().mockRejectedValue(drift),
    });
    const command = createPushCommand(config);

    await command.run({ values: { yes: true } } as never);

    // ConfigDrift is passed through unchanged (not re-wrapped as TOCTOU).
    expect(handleCliError).toHaveBeenCalledWith(drift);
    expect(confirmAndDeploy).not.toHaveBeenCalled();
  });

  it("re-wraps an API optimistic-lock conflict as a TOCTOU conflict on the singleApp route", async () => {
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

    const config = makeConfig({
      pushFn: vi
        .fn()
        .mockRejectedValue(
          new ConflictError(ConflictErrorCode.Conflict, "409"),
        ),
    });
    const command = createPushCommand(config);

    await command.run({ values: { yes: true } } as never);

    const passed = vi.mocked(handleCliError).mock.calls[0]?.[0];
    expect(isConflictError(passed)).toBe(true);
    expect((passed as ConflictError).message).toBe(config.toctouMessage);
    expect(confirmAndDeploy).not.toHaveBeenCalled();
  });
});

describe("createPushCommand — multiApp route is rejected by the factory", () => {
  it("rejects --all (the top-level push dispatcher handles multi, not the factory)", async () => {
    const config = makeConfig();
    const command = createPushCommand(config);

    // routeMultiApp default mock runs singleLegacy, but `all: true` is checked
    // before routing; the factory must reject it with a not-supported error.
    await command.run({ values: { all: true } } as never);

    expect(config.pushFn).not.toHaveBeenCalled();
    const passed = vi.mocked(handleCliError).mock.calls[0]?.[0];
    expect((passed as Error).message).toContain("does not support --all");
  });

  it("rejects the multiApp handler branch with the same not-supported error", async () => {
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
        await handlers.multiApp(
          { orderedApps: [mockApp, mockApp2] },
          mockProjectConfig,
        );
      },
    );

    const config = makeConfig();
    const command = createPushCommand(config);

    await command.run({ values: {} } as never);

    expect(config.pushFn).not.toHaveBeenCalled();
    const passed = vi.mocked(handleCliError).mock.calls[0]?.[0];
    expect((passed as Error).message).toContain("does not support --all");
  });
});
