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

const { mockSeedStorageGet } = vi.hoisted(() => ({
  mockSeedStorageGet: vi.fn(async () => ({
    exists: true,
    content: "records: []",
  })),
}));

vi.mock("@/core/application/container/applyAllCli", () => ({
  createCliApplyAllContainers: vi.fn((config: { appName?: string }) => ({
    containers: {
      // Tag containers with the app name so per-app applyAllForApp calls can be
      // identified by argument and their order asserted (AC-3).
      appName: config?.appName,
      seed: { seedStorage: { get: mockSeedStorageGet } },
    },
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
        results: [{ domain: "schema", success: true, warnings: [] }],
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

  it("実行時に push への移行を案内する deprecation warning を出すこと（AC-1）", async () => {
    await applyCommand.run({ values: {} } as never);

    expect(p.log.warn).toHaveBeenCalledWith(expect.stringContaining("push"));
  });

  it("singleLegacy のエラー文言が旧コマンドではなく push 系の移行先を案内すること（AC-13）", async () => {
    await applyCommand.run({ values: {} } as never);

    expect(p.log.error).toHaveBeenCalledWith(
      expect.stringContaining("schema push"),
    );
    expect(p.log.error).not.toHaveBeenCalledWith(
      expect.stringContaining("schema migrate"),
    );
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
      "Dry run complete. No changes will be applied.",
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

  const mockApp2: AppEntry = {
    name: "test-app-2" as AppName,
    appId: "456",
    dependsOn: ["test-app" as AppName],
  };

  const mockMultiProjectConfig: ProjectConfig = {
    domain: "example.kintone.com",
    apps: new Map([
      ["test-app" as AppName, mockApp],
      ["test-app-2" as AppName, mockApp2],
    ]),
  };

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

  it("multiApp では全アプリの diff を先に収集し、confirm は1回だけ・依存順に apply されること（AC-1/AC-2/AC-3）", async () => {
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

    // Phase 5 runs the executor for each app in dependency order.
    vi.mocked(runMultiAppWithFailCheck).mockImplementationOnce(
      async (_plan, executor) => {
        for (const app of plan.orderedApps) {
          await executor(app);
        }
      },
    );

    vi.mocked(p.confirm).mockResolvedValueOnce(true);
    // applyAllForApp resolves with the module-factory default for both apps.

    await applyCommand.run({ values: {} } as never);

    // Diffs collected for both apps before any apply, confirm exactly once.
    expect(diffAllForApp).toHaveBeenCalledTimes(2);
    expect(p.confirm).toHaveBeenCalledTimes(1);
    expect(p.confirm).toHaveBeenCalledWith({
      message: "Apply these changes to all apps?",
    });
    expect(printAppHeader).toHaveBeenCalledWith("test-app", "123");
    expect(printAppHeader).toHaveBeenCalledWith("test-app-2", "456");
    // Both apps applied in dependency order.
    expect(applyAllForApp).toHaveBeenCalledTimes(2);

    // Assert the actual apply order is the dependency order (test-app first,
    // then test-app-2), not just that apply ran twice. The container is tagged
    // with the app name in Phase 1, so each applyAllForApp call carries the app
    // it applies — the order of those calls is the real apply order.
    const appliedOrder = vi
      .mocked(applyAllForApp)
      .mock.calls.map(
        ([arg]) => (arg.containers as { appName?: string }).appName,
      );
    expect(appliedOrder).toEqual(["test-app", "test-app-2"]);

    // printAppHeader (Phase 1 collection) likewise runs in dependency order.
    const headerOrder = vi
      .mocked(printAppHeader)
      .mock.calls.map(([name]) => name);
    expect(headerOrder).toEqual(["test-app", "test-app-2"]);
  });

  it("multiApp で先頭 app が失敗したら後続 app は apply されないこと（fail-fast・AC-4）", async () => {
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

    // Mirror real executeMultiApp fail-fast semantics at the CLI boundary: stop
    // invoking executors once one returns { ok: false }. This exercises the
    // genuine path where the apply command's executor reports a failure and the
    // following app is skipped (never applied).
    vi.mocked(runMultiAppWithFailCheck).mockImplementationOnce(
      async (_plan, executor) => {
        for (const app of plan.orderedApps) {
          const outcome = await executor(app);
          if (outcome && outcome.ok === false) {
            break;
          }
        }
      },
    );

    vi.mocked(p.confirm).mockResolvedValueOnce(true);
    // First app genuinely fails so its executor returns { ok: false }.
    vi.mocked(applyAllForApp).mockResolvedValueOnce({
      phases: [
        {
          phase: "Schema",
          results: [
            {
              domain: "schema",
              success: false,
              error: new Error("fail"),
              skipped: false,
            },
          ],
        },
      ],
      deployed: false,
    });

    await applyCommand.run({ values: {} } as never);

    // Only the first app was applied; fail-fast prevented the second app's apply.
    expect(applyAllForApp).toHaveBeenCalledTimes(1);
    const appliedOrder = vi
      .mocked(applyAllForApp)
      .mock.calls.map(
        ([arg]) => (arg.containers as { appName?: string }).appName,
      );
    expect(appliedOrder).toEqual(["test-app"]);
  });

  it("multiApp で --yes の場合は confirm をスキップして全アプリを apply すること（AC-5）", async () => {
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

    await applyCommand.run({ values: { yes: true } } as never);

    expect(p.confirm).not.toHaveBeenCalled();
    expect(applyAllForApp).toHaveBeenCalledTimes(2);
  });

  it("multiApp で --dry-run の場合は全アプリ diff 表示後、confirm も apply も行わないこと（AC-6）", async () => {
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

    await applyCommand.run({ values: { "dry-run": true } } as never);

    expect(diffAllForApp).toHaveBeenCalledTimes(2);
    expect(p.confirm).not.toHaveBeenCalled();
    expect(runMultiAppWithFailCheck).not.toHaveBeenCalled();
    expect(applyAllForApp).not.toHaveBeenCalled();
    expect(p.log.info).toHaveBeenCalledWith(
      "Dry run complete. No changes will be applied.",
    );
  });

  it("multiApp で --dry-run のとき diff 変更なし+seed ありのアプリには seed 注記を表示すること（N-001）", async () => {
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

    // app1: diff changes (default). app2: empty diff but seed exists, so the
    // Phase 3 seed note branch (!hasChanges && seedExists) fires.
    vi.mocked(diffAllForApp)
      .mockResolvedValueOnce([
        {
          domain: "schema",
          success: true,
          result: {
            isEmpty: false,
            entries: [],
            schemaFields: [],
            summary: { added: 1, modified: 0, deleted: 0, total: 1 },
            hasLayoutChanges: false,
          },
        },
      ])
      .mockResolvedValueOnce([
        {
          domain: "schema",
          success: true,
          result: {
            isEmpty: true,
            entries: [],
            schemaFields: [],
            summary: { added: 0, modified: 0, deleted: 0, total: 0 },
            hasLayoutChanges: false,
          },
        },
      ]);
    // Both apps have seed (default exists:true), but only app2 has no diff
    // changes, so it is the one driving the dry-run seed note.
    mockSeedStorageGet
      .mockResolvedValueOnce({ exists: true, content: "records: []" })
      .mockResolvedValueOnce({ exists: true, content: "records: []" });

    await applyCommand.run({ values: { "dry-run": true } } as never);

    expect(p.log.info).toHaveBeenCalledWith(
      "Dry run complete. No changes will be applied.",
    );
    expect(p.log.info).toHaveBeenCalledWith(
      "Note: Seed data would still be upserted when running without --dry-run.",
    );
    expect(runMultiAppWithFailCheck).not.toHaveBeenCalled();
    expect(applyAllForApp).not.toHaveBeenCalled();
  });

  it("multiApp で --dry-run かつ全アプリ変更なし・seed なしのとき 'No changes' の後に 'Dry run complete.' も表示すること（W-001）", async () => {
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

    // Both apps: empty diff and no seed.
    vi.mocked(diffAllForApp)
      .mockResolvedValueOnce([
        {
          domain: "schema",
          success: true,
          result: {
            isEmpty: true,
            entries: [],
            schemaFields: [],
            summary: { added: 0, modified: 0, deleted: 0, total: 0 },
            hasLayoutChanges: false,
          },
        },
      ])
      .mockResolvedValueOnce([
        {
          domain: "schema",
          success: true,
          result: {
            isEmpty: true,
            entries: [],
            schemaFields: [],
            summary: { added: 0, modified: 0, deleted: 0, total: 0 },
            hasLayoutChanges: false,
          },
        },
      ]);
    mockSeedStorageGet
      .mockResolvedValueOnce({ exists: false, content: "" })
      .mockResolvedValueOnce({ exists: false, content: "" });

    await applyCommand.run({ values: { "dry-run": true } } as never);

    // Matches single mode: the no-changes message is emitted first, then the
    // dry-run summary line is still surfaced.
    expect(p.log.success).toHaveBeenCalledWith(
      "No changes detected in any app.",
    );
    expect(p.log.info).toHaveBeenCalledWith(
      "Dry run complete. No changes will be applied.",
    );
    expect(p.confirm).not.toHaveBeenCalled();
    expect(runMultiAppWithFailCheck).not.toHaveBeenCalled();
    expect(applyAllForApp).not.toHaveBeenCalled();
  });

  it("multiApp で confirm をキャンセルした場合は apply されないこと", async () => {
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

    vi.mocked(p.confirm).mockResolvedValueOnce(false);

    await applyCommand.run({ values: {} } as never);

    expect(p.cancel).toHaveBeenCalled();
    expect(runMultiAppWithFailCheck).not.toHaveBeenCalled();
    expect(applyAllForApp).not.toHaveBeenCalled();
  });

  it("multiApp で全アプリ変更なし・seed なしの場合は 'No changes detected in any app.' を表示し apply しないこと（AC-7）", async () => {
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

    // Both apps: empty diff and no seed.
    vi.mocked(diffAllForApp)
      .mockResolvedValueOnce([
        {
          domain: "schema",
          success: true,
          result: {
            isEmpty: true,
            entries: [],
            schemaFields: [],
            summary: { added: 0, modified: 0, deleted: 0, total: 0 },
            hasLayoutChanges: false,
          },
        },
      ])
      .mockResolvedValueOnce([
        {
          domain: "schema",
          success: true,
          result: {
            isEmpty: true,
            entries: [],
            schemaFields: [],
            summary: { added: 0, modified: 0, deleted: 0, total: 0 },
            hasLayoutChanges: false,
          },
        },
      ]);
    mockSeedStorageGet
      .mockResolvedValueOnce({ exists: false, content: "" })
      .mockResolvedValueOnce({ exists: false, content: "" });

    await applyCommand.run({ values: {} } as never);

    expect(p.log.success).toHaveBeenCalledWith(
      "No changes detected in any app.",
    );
    expect(p.confirm).not.toHaveBeenCalled();
    expect(runMultiAppWithFailCheck).not.toHaveBeenCalled();
    expect(applyAllForApp).not.toHaveBeenCalled();
  });

  it("multiApp で seed ありアプリは diff 変更なしでも apply されること（AC-8）", async () => {
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

    // Empty diff but seed exists (default mockSeedStorageGet returns exists:true).
    vi.mocked(diffAllForApp).mockResolvedValueOnce([
      {
        domain: "schema",
        success: true,
        result: {
          isEmpty: true,
          entries: [],
          schemaFields: [],
          summary: { added: 0, modified: 0, deleted: 0, total: 0 },
          hasLayoutChanges: false,
        },
      },
    ]);

    vi.mocked(runMultiAppWithFailCheck).mockImplementationOnce(
      async (_plan, executor) => {
        await executor(mockApp);
      },
    );

    vi.mocked(p.confirm).mockResolvedValueOnce(true);

    await applyCommand.run({ values: {} } as never);

    expect(p.log.info).toHaveBeenCalledWith(
      "Note: Seed data will be upserted (no diff preview available).",
    );
    expect(applyAllForApp).toHaveBeenCalled();
  });

  it("multiApp で変更なし・seed なしのアプリは executor 内で skip され {ok:true} を返すこと", async () => {
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

    // app1: has diff changes + seed; app2: empty diff + no seed (skipped).
    vi.mocked(diffAllForApp)
      .mockResolvedValueOnce([
        {
          domain: "schema",
          success: true,
          result: {
            isEmpty: false,
            entries: [],
            schemaFields: [],
            summary: { added: 1, modified: 0, deleted: 0, total: 1 },
            hasLayoutChanges: false,
          },
        },
      ])
      .mockResolvedValueOnce([
        {
          domain: "schema",
          success: true,
          result: {
            isEmpty: true,
            entries: [],
            schemaFields: [],
            summary: { added: 0, modified: 0, deleted: 0, total: 0 },
            hasLayoutChanges: false,
          },
        },
      ]);
    // app1 seed exists, app2 seed absent.
    mockSeedStorageGet
      .mockResolvedValueOnce({ exists: true, content: "records: []" })
      .mockResolvedValueOnce({ exists: false, content: "" });

    const outcomes: unknown[] = [];
    vi.mocked(runMultiAppWithFailCheck).mockImplementationOnce(
      async (_plan, executor) => {
        for (const app of plan.orderedApps) {
          outcomes.push(await executor(app));
        }
      },
    );

    vi.mocked(p.confirm).mockResolvedValueOnce(true);

    await applyCommand.run({ values: {} } as never);

    // Only app1 applied; app2 skipped but returns { ok: true }.
    expect(applyAllForApp).toHaveBeenCalledTimes(1);
    expect(p.log.info).toHaveBeenCalledWith("No changes. Skipping.");
    expect(outcomes[1]).toEqual({ ok: true });
  });

  it("multiApp で先頭 app がドメイン失敗のとき executor が runApplyAll の {ok:false} をそのまま return すること", async () => {
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

    // Capture the executor passed to runMultiAppWithFailCheck and invoke it
    // directly to observe its return value (exit/process termination is out of
    // scope here — that lives behind the mocked boundary).
    let capturedOutcome: unknown;
    vi.mocked(runMultiAppWithFailCheck).mockImplementationOnce(
      async (_plan, executor) => {
        capturedOutcome = await executor(mockApp);
      },
    );

    vi.mocked(p.confirm).mockResolvedValueOnce(true);
    // Genuine execution failure (success:false, skipped:false) so runApplyAll's
    // hasFailures is true and it yields { ok: false }.
    vi.mocked(applyAllForApp).mockResolvedValueOnce({
      phases: [
        {
          phase: "Schema",
          results: [
            {
              domain: "schema",
              success: false,
              error: new Error("fail"),
              skipped: false,
            },
          ],
        },
      ],
      deployed: false,
    });

    await applyCommand.run({ values: {} } as never);

    // With no deployError, the `?? new SystemError(...)` branch produces an
    // app-named ExecutionError SystemError.
    expect(capturedOutcome).toMatchObject({
      ok: false,
      error: expect.objectContaining({
        code: "EXECUTION_ERROR",
        message: expect.stringContaining("test-app"),
      }),
    });
  });

  it("multiApp で deployError がある場合 executor が runApplyAll の {ok:false} に deployError を透過すること", async () => {
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

    let capturedOutcome: unknown;
    vi.mocked(runMultiAppWithFailCheck).mockImplementationOnce(
      async (_plan, executor) => {
        capturedOutcome = await executor(mockApp);
      },
    );

    vi.mocked(p.confirm).mockResolvedValueOnce(true);
    // Success output but a failed deploy: runApplyAll must put the SAME
    // deployError reference into the outcome's error (the left-hand branch of
    // `output.deployError ?? new SystemError(...)`). A regression that swaps it
    // for a fresh SystemError (swallowing deployError) would be caught here.
    const deployError = new Error("Deploy failed");
    vi.mocked(applyAllForApp).mockResolvedValueOnce({
      phases: [
        {
          phase: "Schema",
          results: [{ domain: "schema", success: true, warnings: [] }],
        },
      ],
      deployed: false,
      deployError,
    });

    await applyCommand.run({ values: {} } as never);

    expect(capturedOutcome).toMatchObject({ ok: false });
    expect((capturedOutcome as { error: unknown }).error).toBe(deployError);
  });

  it("multiApp で先頭 app が成功のとき executor が runApplyAll の {ok:true} をそのまま return すること", async () => {
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

    // Mirror of the AC-4(b) failure passthrough: with the default success
    // output (no failures, no deployError) the executor must return { ok: true }
    // so fail-fast is not erroneously triggered in the apply context (AC-3).
    let capturedOutcome: unknown;
    vi.mocked(runMultiAppWithFailCheck).mockImplementationOnce(
      async (_plan, executor) => {
        capturedOutcome = await executor(mockApp);
      },
    );

    vi.mocked(p.confirm).mockResolvedValueOnce(true);

    await applyCommand.run({ values: {} } as never);

    expect(capturedOutcome).toEqual({ ok: true });
  });

  it("multiApp で全ドメイン not-found skip のとき executor が {ok:true} を return すること（fail-fast を誘発しない・AC-5）", async () => {
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

    // #179 graceful skip × multi crossing: an app whose config files are all
    // absent produces not-found-only output (skipped:"not-found", no genuine
    // failure). runApplyAll's hasFailures excludes not-found, so the executor
    // must return { ok: true } and not induce fail-fast for the rest (AC-5).
    let capturedOutcome: unknown;
    vi.mocked(runMultiAppWithFailCheck).mockImplementationOnce(
      async (_plan, executor) => {
        capturedOutcome = await executor(mockApp);
      },
    );

    vi.mocked(p.confirm).mockResolvedValueOnce(true);
    vi.mocked(applyAllForApp).mockResolvedValueOnce({
      phases: [
        {
          phase: "Schema",
          results: [{ domain: "schema", success: false, skipped: "not-found" }],
        },
        {
          phase: "Views & Customization",
          results: [
            { domain: "customize", success: false, skipped: "not-found" },
            { domain: "view", success: false, skipped: "not-found" },
          ],
        },
      ],
      deployed: false,
    });

    await applyCommand.run({ values: {} } as never);

    expect(capturedOutcome).toEqual({ ok: true });
  });

  it("エラー発生時に handleCliError が呼ばれること", async () => {
    const testError = new Error("test error");
    vi.mocked(routeMultiApp).mockRejectedValueOnce(testError);

    await applyCommand.run({ values: {} } as never);

    expect(handleCliError).toHaveBeenCalledWith(testError);
  });

  it("singleApp で Ctrl+C でキャンセルした場合は apply されないこと", async () => {
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
    vi.mocked(p.isCancel).mockReturnValueOnce(true);
    vi.mocked(p.confirm).mockResolvedValueOnce(undefined as never);

    await applyCommand.run({ values: {} } as never);

    expect(p.cancel).toHaveBeenCalled();
    expect(applyAllForApp).not.toHaveBeenCalled();
  });

  it("singleApp で diff 変更がない場合でも apply が実行されること（seed のため）", async () => {
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
    vi.mocked(diffAllForApp).mockResolvedValueOnce([
      {
        domain: "schema",
        success: true,
        result: {
          isEmpty: true,
          entries: [],
          schemaFields: [],
          summary: { added: 0, modified: 0, deleted: 0, total: 0 },
          hasLayoutChanges: false,
        },
      },
    ]);
    vi.mocked(p.confirm).mockResolvedValueOnce(true);

    await applyCommand.run({ values: {} } as never);

    expect(p.log.success).toHaveBeenCalledWith(
      "No changes detected. Seed data will still be upserted.",
    );
    expect(applyAllForApp).toHaveBeenCalled();
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

  it("seed.yaml が存在しない場合は seed 注記が表示されないこと", async () => {
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
    mockSeedStorageGet.mockResolvedValueOnce({ exists: false, content: "" });
    vi.mocked(p.confirm).mockResolvedValueOnce(true);

    await applyCommand.run({ values: {} } as never);

    expect(p.log.info).not.toHaveBeenCalledWith(
      "Note: Seed data will be upserted (no diff preview available).",
    );
    expect(applyAllForApp).toHaveBeenCalled();
  });

  it("seed.yaml が存在せず diff 変更もない場合は 'No changes detected.' と表示されること", async () => {
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
    vi.mocked(diffAllForApp).mockResolvedValueOnce([
      {
        domain: "schema",
        success: true,
        result: {
          isEmpty: true,
          entries: [],
          schemaFields: [],
          summary: { added: 0, modified: 0, deleted: 0, total: 0 },
          hasLayoutChanges: false,
        },
      },
    ]);
    mockSeedStorageGet.mockResolvedValueOnce({ exists: false, content: "" });
    vi.mocked(p.confirm).mockResolvedValueOnce(true);

    await applyCommand.run({ values: {} } as never);

    expect(p.log.success).toHaveBeenCalledWith("No changes detected.");
  });

  it("seed.yaml が存在し --dry-run かつ差分なしの場合は dry-run の seed 注記が表示されること", async () => {
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
    vi.mocked(diffAllForApp).mockResolvedValueOnce([
      {
        domain: "schema",
        success: true,
        result: {
          isEmpty: true,
          entries: [],
          schemaFields: [],
          summary: { added: 0, modified: 0, deleted: 0, total: 0 },
          hasLayoutChanges: false,
        },
      },
    ]);

    await applyCommand.run({ values: { "dry-run": true } } as never);

    expect(p.log.info).toHaveBeenCalledWith(
      "Note: Seed data would still be upserted when running without --dry-run.",
    );
    expect(applyAllForApp).not.toHaveBeenCalled();
  });

  it("seed.yaml が存在せず --dry-run かつ差分なしの場合は dry-run の seed 注記が表示されないこと", async () => {
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
    vi.mocked(diffAllForApp).mockResolvedValueOnce([
      {
        domain: "schema",
        success: true,
        result: {
          isEmpty: true,
          entries: [],
          schemaFields: [],
          summary: { added: 0, modified: 0, deleted: 0, total: 0 },
          hasLayoutChanges: false,
        },
      },
    ]);
    mockSeedStorageGet.mockResolvedValueOnce({ exists: false, content: "" });

    await applyCommand.run({ values: { "dry-run": true } } as never);

    expect(p.log.info).not.toHaveBeenCalledWith(
      "Note: Seed data would still be upserted when running without --dry-run.",
    );
    expect(applyAllForApp).not.toHaveBeenCalled();
  });

  it("apply で失敗があった場合に exitCode が 1 になること", async () => {
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
    vi.mocked(applyAllForApp).mockResolvedValueOnce({
      phases: [
        {
          phase: "Schema",
          results: [
            {
              domain: "schema",
              success: false,
              error: new Error("fail"),
              skipped: false,
            },
          ],
        },
      ],
      deployed: false,
    });

    await applyCommand.run({ values: {} } as never);

    expect(process.exitCode).toBe(1);
  });

  it("全ドメインが not-found skip の場合は exitCode が 1 にならないこと", async () => {
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
    vi.mocked(applyAllForApp).mockResolvedValueOnce({
      phases: [
        {
          phase: "Schema",
          results: [{ domain: "schema", success: false, skipped: "not-found" }],
        },
        {
          phase: "Views & Customization",
          results: [
            { domain: "customize", success: false, skipped: "not-found" },
            { domain: "view", success: false, skipped: "not-found" },
          ],
        },
      ],
      deployed: false,
    });

    await applyCommand.run({ values: {} } as never);

    expect(process.exitCode).toBeUndefined();
  });

  it("success がありつつ deploy 不要 (deployed:false・deployError なし) の場合は exitCode が 1 にならないこと", async () => {
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
    // At least one success, but no deploy was needed (deployed:false) and no
    // deployError. Under the old `!output.deployed` rule this would have wrongly
    // raised exitCode to 1; the new `hasFailures || output.deployError` rule
    // must keep it unset.
    vi.mocked(applyAllForApp).mockResolvedValueOnce({
      phases: [
        {
          phase: "Schema",
          results: [{ domain: "schema", success: false, skipped: "not-found" }],
        },
        {
          phase: "Seed Data",
          results: [{ domain: "seed", success: true, warnings: [] }],
        },
      ],
      deployed: false,
    });

    await applyCommand.run({ values: {} } as never);

    expect(process.exitCode).toBeUndefined();
  });

  it("一部 success だが末尾 deploy が失敗した場合は exitCode が 1 になること", async () => {
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
    vi.mocked(applyAllForApp).mockResolvedValueOnce({
      phases: [
        {
          phase: "Schema",
          results: [{ domain: "schema", success: false, skipped: "not-found" }],
        },
        {
          phase: "Views & Customization",
          results: [{ domain: "customize", success: true, warnings: [] }],
        },
      ],
      deployed: false,
      deployError: new Error("Deploy failed"),
    });

    await applyCommand.run({ values: {} } as never);

    expect(process.exitCode).toBe(1);
  });

  it("not-found skip は spinner の失敗カウント (N failed) に含まれないこと", async () => {
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
    // One genuine failure (counts as failed) plus two not-found skips (must NOT
    // count as failed). If applyFailCount regressed to plain `!r.success`
    // (without the `r.skipped !== "not-found"` exclusion) the stop message would
    // read "(3 failed)" and this assertion would fail.
    vi.mocked(applyAllForApp).mockResolvedValueOnce({
      phases: [
        {
          phase: "Schema",
          results: [{ domain: "schema", success: false, skipped: "not-found" }],
        },
        {
          phase: "Views & Customization",
          results: [
            {
              domain: "customize",
              success: false,
              error: new Error("fail"),
              skipped: false,
            },
            { domain: "view", success: false, skipped: "not-found" },
          ],
        },
      ],
      deployed: false,
    });

    await applyCommand.run({ values: {} } as never);

    // p.spinner() is called twice: [0] = diff spinner, [1] = apply spinner.
    // Inspect the apply spinner's stop() argument (the message string).
    const applySpinner = vi.mocked(p.spinner).mock.results[1]
      .value as ReturnType<typeof p.spinner>;
    const stopMessage = vi.mocked(applySpinner.stop).mock.calls[0][0] as string;
    expect(stopMessage).toContain("(1 failed)");
    expect(stopMessage).not.toContain("(3 failed)");
  });

  it("全ドメイン not-found skip のとき spinner に (N failed) が表示されないこと", async () => {
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
    // All not-found skips. If applyFailCount regressed to plain `!r.success`
    // this would read "(2 failed)"; with the exclusion it must omit "failed".
    vi.mocked(applyAllForApp).mockResolvedValueOnce({
      phases: [
        {
          phase: "Schema",
          results: [{ domain: "schema", success: false, skipped: "not-found" }],
        },
        {
          phase: "Views & Customization",
          results: [
            { domain: "customize", success: false, skipped: "not-found" },
          ],
        },
      ],
      deployed: false,
    });

    await applyCommand.run({ values: {} } as never);

    const applySpinner = vi.mocked(p.spinner).mock.results[1]
      .value as ReturnType<typeof p.spinner>;
    const stopMessage = vi.mocked(applySpinner.stop).mock.calls[0][0] as string;
    expect(stopMessage).toBe("Apply complete.");
    expect(stopMessage).not.toContain("failed");
  });

  it("aborted skip がある場合は exitCode が 1 になること", async () => {
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
    vi.mocked(applyAllForApp).mockResolvedValueOnce({
      phases: [
        {
          phase: "Schema",
          results: [
            {
              domain: "schema",
              success: false,
              error: new Error("fail"),
              skipped: false,
            },
          ],
        },
        {
          phase: "Views & Customization",
          results: [
            {
              domain: "customize",
              success: false,
              error: new Error("Skipped due to fatal error"),
              skipped: "aborted",
            },
          ],
        },
      ],
      deployed: false,
    });

    await applyCommand.run({ values: {} } as never);

    expect(process.exitCode).toBe(1);
  });
});
