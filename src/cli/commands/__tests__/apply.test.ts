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

vi.mock("../../diffAllOutput", () => ({
  printDiffAllResults: vi.fn(),
}));

vi.mock("../../applyAllOutput", () => ({
  printApplyAllResults: vi.fn(),
}));

vi.mock("@/core/application/container/applyAllCli", () => ({
  createCliApplyAllContainers: vi.fn(() => ({
    containers: {},
    diffContainers: {},
    paths: {
      schema: "test-app/schema.yaml",
      customize: "test-app/customize.yaml",
      view: "test-app/view.yaml",
      settings: "test-app/settings.yaml",
      notification: "test-app/notification.yaml",
      report: "test-app/report.yaml",
      action: "test-app/action.yaml",
      process: "test-app/process.yaml",
      fieldAcl: "test-app/field-acl.yaml",
      appAcl: "test-app/app-acl.yaml",
      recordAcl: "test-app/record-acl.yaml",
      adminNotes: "test-app/admin-notes.yaml",
      plugin: "test-app/plugin.yaml",
      seed: "test-app/seed.yaml",
    },
  })),
}));

vi.mock("@/core/application/diffAll/diffAllForApp", () => ({
  diffAllForApp: vi.fn(async () => [
    {
      domain: "schema",
      success: true,
      result: {
        isEmpty: false,
        entries: [],
        summary: { added: 1, modified: 0, deleted: 0, total: 1 },
        hasLayoutChanges: false,
      },
    },
  ]),
}));

vi.mock("@/core/application/applyAll/applyAllForApp", () => ({
  applyAllForApp: vi.fn(async () => ({
    phases: [
      {
        phase: "Schema",
        results: [{ domain: "schema", success: true }],
      },
    ],
    deployed: true,
  })),
}));

import * as p from "@clack/prompts";
import { applyAllForApp } from "@/core/application/applyAll/applyAllForApp";
import { diffAllForApp } from "@/core/application/diffAll/diffAllForApp";
import type {
  AppEntry,
  ExecutionPlan,
  ProjectConfig,
} from "@/core/domain/projectConfig/entity";
import type { AppName } from "@/core/domain/projectConfig/valueObject";
import { printApplyAllResults } from "../../applyAllOutput";
import { printDiffAllResults } from "../../diffAllOutput";
import { handleCliError } from "../../handleError";
import { printAppHeader } from "../../output";
import { routeMultiApp, runMultiAppWithFailCheck } from "../../projectConfig";
import applyCommand from "../apply";

afterEach(() => {
  vi.clearAllMocks();
  process.exitCode = undefined;
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

describe("apply command", () => {
  it("singleLegacy ではエラーメッセージを表示し exitCode を 1 にすること", async () => {
    await applyCommand.run({ values: {} } as never);

    expect(p.log.error).toHaveBeenCalledWith(
      expect.stringContaining("requires a project config file"),
    );
    expect(process.exitCode).toBe(1);
  });

  it("singleApp では diffAllForApp と applyAllForApp が呼ばれること", async () => {
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

    await applyCommand.run({ values: {} } as never);

    expect(diffAllForApp).toHaveBeenCalled();
    expect(printDiffAllResults).toHaveBeenCalled();
    expect(applyAllForApp).toHaveBeenCalled();
    expect(printApplyAllResults).toHaveBeenCalled();
  });

  it("singleApp で --yes の場合は確認プロンプトをスキップすること", async () => {
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

    await applyCommand.run({ values: { yes: true } } as never);

    expect(p.confirm).not.toHaveBeenCalled();
    expect(applyAllForApp).toHaveBeenCalled();
  });

  it("singleApp で --dry-run の場合は apply せず diff のみ表示すること", async () => {
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

    await applyCommand.run({ values: { "dry-run": true } } as never);

    expect(diffAllForApp).toHaveBeenCalled();
    expect(printDiffAllResults).toHaveBeenCalled();
    expect(applyAllForApp).not.toHaveBeenCalled();
    expect(p.log.info).toHaveBeenCalledWith(
      "Dry run complete. No changes applied.",
    );
  });

  it("singleApp で確認プロンプトをキャンセルした場合は apply されないこと", async () => {
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

    await applyCommand.run({ values: {} } as never);

    expect(applyAllForApp).not.toHaveBeenCalled();
  });

  it("multiApp では runMultiAppWithFailCheck が呼ばれ printAppHeader が表示されること", async () => {
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

    vi.mocked(p.confirm).mockResolvedValueOnce(true);

    await applyCommand.run({ values: {} } as never);

    expect(runMultiAppWithFailCheck).toHaveBeenCalled();
    expect(printAppHeader).toHaveBeenCalledWith("test-app", "123");
    expect(diffAllForApp).toHaveBeenCalled();
    expect(applyAllForApp).toHaveBeenCalled();
  });

  it("エラー発生時に handleCliError が呼ばれること", async () => {
    const testError = new Error("test error");
    vi.mocked(routeMultiApp).mockRejectedValueOnce(testError);

    await applyCommand.run({ values: {} } as never);

    expect(handleCliError).toHaveBeenCalledWith(testError);
  });

  it("seed data のメッセージが表示されること", async () => {
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

    await applyCommand.run({ values: {} } as never);

    expect(p.log.info).toHaveBeenCalledWith(
      "Note: Seed data will be upserted (no diff preview available).",
    );
  });
});
