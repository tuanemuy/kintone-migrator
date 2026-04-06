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
    schemaFilePath: "test-app/schema.yaml",
  })),
  runMultiAppWithFailCheck: vi.fn(),
}));

vi.mock("../../output", () => ({
  printAppHeader: vi.fn(),
}));

vi.mock("../../diffAllOutput", () => ({
  printDiffAllResults: vi.fn(),
}));

vi.mock("@/core/application/container/diffAllCli", () => ({
  createCliDiffAllContainers: vi.fn(() => ({
    containers: {},
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
        isEmpty: true,
        summary: { added: 0, modified: 0, deleted: 0, total: 0 },
        entries: [],
      },
    },
  ]),
}));

import * as p from "@clack/prompts";
import { diffAllForApp } from "@/core/application/diffAll/diffAllForApp";
import type {
  AppEntry,
  ExecutionPlan,
  ProjectConfig,
} from "@/core/domain/projectConfig/entity";
import type { AppName } from "@/core/domain/projectConfig/valueObject";
import { printDiffAllResults } from "../../diffAllOutput";
import { handleCliError } from "../../handleError";
import { routeMultiApp, runMultiAppWithFailCheck } from "../../projectConfig";
import diffCommand from "../diff";

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

describe("diff command", () => {
  it("singleLegacy ではエラーメッセージを表示すること", async () => {
    await diffCommand.run({ values: {} } as never);

    expect(p.log.error).toHaveBeenCalledWith(
      expect.stringContaining("requires a project config file"),
    );
  });

  it("singleApp では diffAllForApp と printDiffAllResults が呼ばれること", async () => {
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

    await diffCommand.run({ values: {} } as never);

    expect(diffAllForApp).toHaveBeenCalled();
    expect(printDiffAllResults).toHaveBeenCalled();
  });

  it("multiApp では runMultiAppWithFailCheck が呼ばれること", async () => {
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

    await diffCommand.run({ values: {} } as never);

    expect(runMultiAppWithFailCheck).toHaveBeenCalled();
    expect(diffAllForApp).toHaveBeenCalled();
    expect(printDiffAllResults).toHaveBeenCalled();
  });

  it("エラー発生時に handleCliError が呼ばれること", async () => {
    const testError = new Error("test error");
    vi.mocked(routeMultiApp).mockRejectedValueOnce(testError);

    await diffCommand.run({ values: {} } as never);

    expect(handleCliError).toHaveBeenCalledWith(testError);
  });
});
