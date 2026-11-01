import { stripVTControlCharacters } from "node:util";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const spinnerStop = vi.fn();

vi.mock("@clack/prompts", () => ({
  spinner: vi.fn(() => ({ start: vi.fn(), stop: spinnerStop })),
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
  logError: vi.fn(),
}));

vi.mock("../../config", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../config")>()),
  resolveConfig: vi.fn(() => ({
    baseUrl: "https://example.kintone.com",
    auth: { type: "apiToken", apiToken: "test-token" },
    appId: "100",
  })),
}));

// Routing is driven per test; the multi-app runner is the real one so the
// fail-fast behavior (skip the rest, then throw) is what the command sees.
vi.mock("../../projectConfig", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../projectConfig")>()),
  routeMultiApp: vi.fn(),
  resolveAppCliConfig: vi.fn((app: { appId: string }) => ({
    baseUrl: "https://example.kintone.com",
    auth: { type: "apiToken", apiToken: "test-token" },
    appId: app.appId,
  })),
  printAvailableApps: vi.fn(),
}));

vi.mock("@/core/application/container/deployStateCli", () => ({
  createDeployStateCliContainer: vi.fn(),
}));

import * as p from "@clack/prompts";
import { createDeployStateCliContainer } from "@/core/application/container/deployStateCli";
import { NotFoundError, NotFoundErrorCode } from "@/core/application/error";
import type { AppRevisionGenerations } from "@/core/domain/appRevision/valueObject";
import type {
  AppEntry,
  ExecutionPlan,
  ProjectConfig,
} from "@/core/domain/projectConfig/entity";
import type { AppName } from "@/core/domain/projectConfig/valueObject";
import { handleCliError } from "../../handleError";
import type { MultiAppHandlers } from "../../projectConfig";
import { printAvailableApps, routeMultiApp } from "../../projectConfig";
import checkPendingCommand from "../check-pending";

type RemoteApp = AppRevisionGenerations | Error;

const UP_TO_DATE: AppRevisionGenerations = {
  preview: "4",
  published: { kind: "deployed", revision: "4" },
};
const PENDING: AppRevisionGenerations = {
  preview: "5",
  published: { kind: "deployed", revision: "4" },
};
const NEVER_DEPLOYED: AppRevisionGenerations = {
  preview: "2",
  published: { kind: "neverDeployed" },
};

function givenRemoteApps(appsById: Record<string, RemoteApp>): void {
  vi.mocked(createDeployStateCliContainer).mockImplementation((config) => ({
    appRevisionGenerationsReader: {
      read: async () => {
        const remote = appsById[config.appId];
        if (remote === undefined) {
          throw new Error(`no remote app ${config.appId}`);
        }
        if (remote instanceof Error) {
          throw remote;
        }
        return remote;
      },
    },
  }));
}

function routeTo(invoke: (handlers: MultiAppHandlers) => Promise<void>): void {
  vi.mocked(routeMultiApp).mockImplementationOnce(async (_values, handlers) =>
    invoke(handlers),
  );
}

function makeApp(name: string, appId: string): AppEntry {
  return { name: name as AppName, appId, dependsOn: [] };
}

function makeProjectConfig(apps: readonly AppEntry[]): ProjectConfig {
  return {
    domain: "example.kintone.com",
    apps: new Map(apps.map((app) => [app.name, app])),
  };
}

function logged(fn: (...args: never[]) => unknown): string[] {
  return vi
    .mocked(fn)
    .mock.calls.map((call) => stripVTControlCharacters(String(call[0])));
}

async function runCommand(): Promise<void> {
  await checkPendingCommand.run({ values: {} } as never);
}

beforeEach(() => {
  process.exitCode = undefined;
});

afterEach(() => {
  vi.clearAllMocks();
  process.exitCode = undefined;
});

describe("check-pending command", () => {
  describe("単一アプリ", () => {
    it.each([
      [
        "legacy",
        (handlers: MultiAppHandlers) => handlers.singleLegacy(),
        "100",
      ],
      [
        "--app",
        (handlers: MultiAppHandlers) => {
          const app = makeApp("customer", "200");
          return handlers.singleApp(app, makeProjectConfig([app]));
        },
        "200",
      ],
    ])("%s: upToDate なら revision を表示し、終了コードを変えない", async (_label, invoke, appId) => {
      givenRemoteApps({ [appId]: UP_TO_DATE });
      routeTo(invoke);

      await runCommand();

      expect(createDeployStateCliContainer).toHaveBeenCalledWith(
        expect.objectContaining({ appId }),
      );
      expect(logged(p.log.success)).toEqual([
        "No undeployed changes (preview and published are both at revision 4).",
      ]);
      expect(spinnerStop).toHaveBeenCalledWith("Check complete.");
      expect(process.exitCode).toBeUndefined();
    });

    it.each([
      [
        "legacy",
        (handlers: MultiAppHandlers) => handlers.singleLegacy(),
        "100",
      ],
      [
        "--app",
        (handlers: MultiAppHandlers) => {
          const app = makeApp("customer", "200");
          return handlers.singleApp(app, makeProjectConfig([app]));
        },
        "200",
      ],
    ])("%s: pending なら両世代の revision と deploy 処理中の可能性を表示し、終了コード 1", async (_label, invoke, appId) => {
      givenRemoteApps({ [appId]: PENDING });
      routeTo(invoke);

      await runCommand();

      expect(logged(p.log.warn)).toEqual([
        "Undeployed changes are pending: preview is at revision 5, published is at revision 4. A deploy would publish them.\nA deploy that is still in progress also shows up this way.",
      ]);
      expect(p.log.success).not.toHaveBeenCalled();
      expect(spinnerStop).toHaveBeenCalledWith("Check complete.");
      expect(process.exitCode).toBe(1);
    });

    it("neverDeployed なら設定全体が公開されることを表示し、終了コード 1", async () => {
      givenRemoteApps({ "100": NEVER_DEPLOYED });
      routeTo((handlers) => handlers.singleLegacy());

      await runCommand();

      expect(logged(p.log.warn)).toEqual([
        "The app has never been deployed (preview revision 2). A deploy would publish its entire configuration.",
      ]);
      expect(spinnerStop).toHaveBeenCalledWith("Check complete.");
      expect(process.exitCode).toBe(1);
    });

    it("読み取りが失敗したらスピナーを止めてから handleCliError に渡す", async () => {
      const error = new NotFoundError(NotFoundErrorCode.NotFound, "missing");
      givenRemoteApps({ "100": error });
      routeTo((handlers) => handlers.singleLegacy());

      await runCommand();

      expect(spinnerStop).toHaveBeenCalledWith("Check failed.");
      expect(spinnerStop).not.toHaveBeenCalledWith("Check complete.");
      expect(handleCliError).toHaveBeenCalledWith(error);
    });
  });

  describe("--all", () => {
    const appA = makeApp("a", "1");
    const appB = makeApp("b", "2");
    const appC = makeApp("c", "3");
    const plan: ExecutionPlan = { orderedApps: [appA, appB, appC] };
    const config = makeProjectConfig([appA, appB, appC]);

    it("全アプリが upToDate なら全アプリを判定して成功を表示し、終了コードを変えない", async () => {
      givenRemoteApps({ "1": UP_TO_DATE, "2": UP_TO_DATE, "3": UP_TO_DATE });
      routeTo((handlers) => handlers.multiApp(plan, config));

      await runCommand();

      expect(createDeployStateCliContainer).toHaveBeenCalledTimes(3);
      expect(logged(p.log.success)).toContain(
        "No undeployed changes in any app.",
      );
      expect(logged(p.log.warn)).toEqual([]);
      expect(process.exitCode).toBeUndefined();
    });

    it("pending / neverDeployed のアプリがあっても残りを判定し、該当アプリを並べて終了コード 1", async () => {
      givenRemoteApps({ "1": PENDING, "2": UP_TO_DATE, "3": NEVER_DEPLOYED });
      routeTo((handlers) => handlers.multiApp(plan, config));

      await runCommand();

      expect(
        vi
          .mocked(createDeployStateCliContainer)
          .mock.calls.map(([config]) => config.appId),
      ).toEqual(["1", "2", "3"]);
      expect(logged(p.log.warn)).toContain(
        "Undeployed changes in 2 app(s): a, c",
      );
      expect(logged(p.log.success)).not.toContain(
        "No undeployed changes in any app.",
      );
      expect(handleCliError).not.toHaveBeenCalled();
      expect(process.exitCode).toBe(1);
    });

    it("読み取りエラーで止まったら、それまでの該当アプリを並べてから handleCliError に渡す", async () => {
      const error = new NotFoundError(NotFoundErrorCode.NotFound, "missing");
      givenRemoteApps({ "1": PENDING, "2": error, "3": UP_TO_DATE });
      routeTo((handlers) => handlers.multiApp(plan, config));

      await runCommand();

      expect(createDeployStateCliContainer).toHaveBeenCalledTimes(2);
      expect(spinnerStop).toHaveBeenCalledWith("Check failed.");
      expect(logged(p.log.warn)).toContain("Undeployed changes in 1 app(s): a");
      expect(handleCliError).toHaveBeenCalledWith(
        expect.objectContaining({ code: "EXECUTION_ERROR" }),
      );
      const summaryCall = logged(p.log.warn).indexOf(
        "Undeployed changes in 1 app(s): a",
      );
      expect(
        vi.mocked(p.log.warn).mock.invocationCallOrder[summaryCall],
      ).toBeLessThan(
        vi.mocked(handleCliError).mock.invocationCallOrder[0] ?? 0,
      );
    });

    it("該当アプリが無いままエラーで止まったら、全アプリで無しとは表示しない", async () => {
      const error = new NotFoundError(NotFoundErrorCode.NotFound, "missing");
      givenRemoteApps({ "1": UP_TO_DATE, "2": error, "3": UP_TO_DATE });
      routeTo((handlers) => handlers.multiApp(plan, config));

      await runCommand();

      expect(logged(p.log.success)).not.toContain(
        "No undeployed changes in any app.",
      );
      expect(
        logged(p.log.warn).filter((m) => m.startsWith("Undeployed")),
      ).toEqual([]);
      expect(handleCliError).toHaveBeenCalled();
    });
  });

  it("アプリが選ばれていなければ一覧を出し、何も判定せずに終了コード 1", async () => {
    const config = makeProjectConfig([makeApp("a", "1")]);
    routeTo(async (handlers) => {
      if (!handlers.listApps) {
        throw new Error("listApps handler is not set");
      }
      await handlers.listApps(config);
    });

    await runCommand();

    expect(printAvailableApps).toHaveBeenCalledWith(config);
    expect(createDeployStateCliContainer).not.toHaveBeenCalled();
    expect(logged(p.log.error)).toEqual([
      "No app was checked. Pass --app <name> or --all to check for undeployed changes.",
    ]);
    expect(process.exitCode).toBe(1);
  });
});
