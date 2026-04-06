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
  })),
  runMultiAppWithFailCheck: vi.fn(),
}));

vi.mock("../../output", () => ({
  printAppHeader: vi.fn(),
}));

vi.mock("../../captureAllOutput", () => ({
  printCaptureAllResults: vi.fn(),
}));

vi.mock("@/core/application/container/captureAllCli", () => ({
  createCliCaptureContainers: vi.fn(() => ({
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

vi.mock("@/core/application/init/captureAllForApp", () => ({
  captureAllForApp: vi.fn(async () => [{ domain: "schema", success: true }]),
}));

import * as p from "@clack/prompts";
import { captureAllForApp } from "@/core/application/init/captureAllForApp";
import type {
  AppEntry,
  ExecutionPlan,
  ProjectConfig,
} from "@/core/domain/projectConfig/entity";
import type { AppName } from "@/core/domain/projectConfig/valueObject";
import { printCaptureAllResults } from "../../captureAllOutput";
import { handleCliError } from "../../handleError";
import { printAppHeader } from "../../output";
import { routeMultiApp, runMultiAppWithFailCheck } from "../../projectConfig";
import captureCommand from "../capture";

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

describe("capture command", () => {
  it("singleLegacy ではエラーメッセージを表示し exitCode を 1 にすること", async () => {
    await captureCommand.run({ values: {} } as never);

    expect(p.log.error).toHaveBeenCalledWith(
      expect.stringContaining("requires a project config file"),
    );
    expect(process.exitCode).toBe(1);
  });

  it("singleApp では captureAllForApp と printCaptureAllResults が呼ばれること", async () => {
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

    await captureCommand.run({ values: {} } as never);

    expect(captureAllForApp).toHaveBeenCalled();
    expect(printCaptureAllResults).toHaveBeenCalled();
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

    await captureCommand.run({ values: {} } as never);

    expect(runMultiAppWithFailCheck).toHaveBeenCalled();
    expect(printAppHeader).toHaveBeenCalledWith("test-app", "123");
    expect(captureAllForApp).toHaveBeenCalled();
    expect(printCaptureAllResults).toHaveBeenCalled();
  });

  it("エラー発生時に handleCliError が呼ばれること", async () => {
    const testError = new Error("test error");
    vi.mocked(routeMultiApp).mockRejectedValueOnce(testError);

    await captureCommand.run({ values: {} } as never);

    expect(handleCliError).toHaveBeenCalledWith(testError);
  });
});
