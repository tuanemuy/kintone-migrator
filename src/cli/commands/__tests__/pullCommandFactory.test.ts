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
  select: vi.fn(() => "remote"),
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

import type {
  AppEntry,
  ProjectConfig,
} from "@/core/domain/projectConfig/entity";
import type { AppName } from "@/core/domain/projectConfig/valueObject";
import { handleCliError } from "../../handleError";
import { routeMultiApp } from "../../projectConfig";
import { createPullCommand } from "../pullCommandFactory";

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

type TestMerged = {
  hasConflict: boolean;
  conflicts: readonly { key: string }[];
};

function makeConfig(
  overrides: Partial<Parameters<typeof createPullCommand>[0]> = {},
) {
  return {
    description: "Pull test config",
    args: {} as Record<string, never>,
    subject: "test config",
    conflictNoun: "entry",
    createContainer: vi.fn((config: string) => ({ appName: config })),
    pullFn: vi.fn().mockResolvedValue({
      mode: "merged",
      merged: { hasConflict: false, conflicts: [] },
    }),
    getMergeView: vi.fn((merged: TestMerged) => merged),
    applyMerge: vi.fn().mockResolvedValue(undefined),
    resolveContainerConfig: vi.fn(() => "legacy-app"),
    resolveAppContainerConfig: vi.fn((app: AppEntry) => app.name),
    ...overrides,
  } as Parameters<typeof createPullCommand>[0];
}

describe("createPullCommand — singleApp route", () => {
  it("runs the pull usecase and applies the merge on the singleApp route", async () => {
    // The all-command tests pin routeMultiApp to singleLegacy; this exercises the
    // singleApp branch so the factory's per-app pull path is actually run.
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
    const command = createPullCommand(config);

    await command.run({ values: {} } as never);

    expect(config.resolveAppContainerConfig).toHaveBeenCalled();
    expect(config.pullFn).toHaveBeenCalled();
    // Conflict-free merge auto-applied with an empty resolution map.
    expect(config.applyMerge).toHaveBeenCalledWith(
      expect.objectContaining({ resolution: new Map() }),
    );
    expect(handleCliError).not.toHaveBeenCalled();
  });

  it("resolves conflicts via --theirs and applies on the singleApp route", async () => {
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
      pullFn: vi.fn().mockResolvedValue({
        mode: "merged",
        merged: { hasConflict: true, conflicts: [{ key: "k1" }] },
      }),
    });
    const command = createPullCommand(config);

    await command.run({ values: { theirs: true } } as never);

    expect(config.applyMerge).toHaveBeenCalled();
    const resolution = vi.mocked(config.applyMerge).mock.calls[0]?.[0]
      ?.resolution;
    expect(resolution.get("k1")).toBe("remote");
    expect(handleCliError).not.toHaveBeenCalled();
  });
});

describe("createPullCommand — multiApp route is rejected by the factory", () => {
  it("rejects --all (the top-level pull dispatcher handles multi, not the factory)", async () => {
    const config = makeConfig();
    const command = createPullCommand(config);

    await command.run({ values: { all: true } } as never);

    expect(config.pullFn).not.toHaveBeenCalled();
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
    const command = createPullCommand(config);

    await command.run({ values: {} } as never);

    expect(config.pullFn).not.toHaveBeenCalled();
    const passed = vi.mocked(handleCliError).mock.calls[0]?.[0];
    expect((passed as Error).message).toContain("does not support --all");
  });

  it("rejects --ours and --theirs combined before routing", async () => {
    const config = makeConfig();
    const command = createPullCommand(config);

    await command.run({ values: { ours: true, theirs: true } } as never);

    expect(config.pullFn).not.toHaveBeenCalled();
    const passed = vi.mocked(handleCliError).mock.calls[0]?.[0];
    expect((passed as Error).message).toContain(
      "--ours and --theirs cannot be used together",
    );
  });
});
