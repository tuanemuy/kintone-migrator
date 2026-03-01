import { afterEach, describe, expect, it, vi } from "vitest";
import type { DetectDiffOutput } from "@/core/application/formSchema/dto";
import type { FieldCode } from "@/core/domain/formSchema/valueObject";

vi.mock("@clack/prompts", () => ({
  log: {
    info: vi.fn(),
    warn: vi.fn(),
    success: vi.fn(),
    step: vi.fn(),
    error: vi.fn(),
  },
  note: vi.fn(),
  confirm: vi.fn(),
  spinner: vi.fn(() => ({ start: vi.fn(), stop: vi.fn() })),
  isCancel: vi.fn(() => false),
}));

vi.mock("../handleError", () => ({
  logError: vi.fn(),
}));

import * as p from "@clack/prompts";
import type { ActionDiffEntry } from "@/core/domain/action/valueObject";
import type { AdminNotesDiffEntry } from "@/core/domain/adminNotes/valueObject";
import type { AppPermissionDiffEntry } from "@/core/domain/appPermission/valueObject";
import type { CustomizationDiffEntry } from "@/core/domain/customization/valueObject";
import type { DiffResult } from "@/core/domain/diff";
import type { FieldPermissionDiffEntry } from "@/core/domain/fieldPermission/valueObject";
import type { GeneralSettingsDiffEntry } from "@/core/domain/generalSettings/valueObject";
import type { NotificationDiffEntry } from "@/core/domain/notification/valueObject";
import type { PluginDiffEntry } from "@/core/domain/plugin/valueObject";
import type { ProcessManagementDiffEntry } from "@/core/domain/processManagement/valueObject";
import type { MultiAppResult } from "@/core/domain/projectConfig/entity";
import type { AppName } from "@/core/domain/projectConfig/valueObject";
import type { RecordPermissionDiffEntry } from "@/core/domain/recordPermission/valueObject";
import type { ReportDiffEntry } from "@/core/domain/report/valueObject";
import type { ViewDiffEntry } from "@/core/domain/view/valueObject";
import { logError } from "../handleError";
import {
  confirmAndDeploy,
  printActionDiffResult,
  printAdminNotesDiffResult,
  printAppHeader,
  printAppPermissionDiffResult,
  printCustomizationDiffResult,
  printDiffResult,
  printFieldPermissionDiffResult,
  printGeneralSettingsDiffResult,
  printMultiAppResult,
  printNotificationDiffResult,
  printPluginDiffResult,
  printProcessDiffResult,
  printRecordPermissionDiffResult,
  printReportDiffResult,
  printViewDiffResult,
  promptDeploy,
} from "../output";

afterEach(() => {
  vi.clearAllMocks();
});

function emptyResult(): DetectDiffOutput {
  return {
    entries: [],
    schemaFields: [],
    summary: { added: 0, modified: 0, deleted: 0, total: 0 },
    isEmpty: true,
    hasLayoutChanges: false,
  };
}

describe("printDiffResult", () => {
  it("差分がない場合、'No changes detected.' とログ出力される", () => {
    printDiffResult(emptyResult());
    expect(p.log.info).toHaveBeenCalledWith("No changes detected.");
    expect(p.note).not.toHaveBeenCalled();
  });

  it("追加エントリがある場合、'+' プレフィックスと件数がログ出力される", () => {
    const result: DetectDiffOutput = {
      entries: [
        {
          type: "added",
          fieldCode: "name" as FieldCode,
          fieldLabel: "名前",
          details: "SINGLE_LINE_TEXT を追加",
        },
      ],
      schemaFields: [
        {
          fieldCode: "name" as FieldCode,
          fieldLabel: "名前",
          fieldType: "SINGLE_LINE_TEXT",
        },
      ],
      summary: { added: 1, modified: 0, deleted: 0, total: 1 },
      isEmpty: false,
      hasLayoutChanges: false,
    };

    printDiffResult(result);

    // Changes サマリーが出力される
    expect(p.log.info).toHaveBeenCalledWith(
      expect.stringContaining("+1 added"),
    );
    // Diff Details ノートが出力される
    expect(p.note).toHaveBeenCalledWith(
      expect.stringContaining("name"),
      "Diff Details",
      expect.objectContaining({ format: expect.any(Function) }),
    );
  });

  it("変更エントリがある場合、'~' プレフィックスと件数がログ出力される", () => {
    const result: DetectDiffOutput = {
      entries: [
        {
          type: "modified",
          fieldCode: "name" as FieldCode,
          fieldLabel: "名前",
          details: "ラベルが変更されました",
          before: {
            code: "name" as FieldCode,
            type: "SINGLE_LINE_TEXT",
            label: "旧名前",
            properties: {},
          },
          after: {
            code: "name" as FieldCode,
            type: "SINGLE_LINE_TEXT",
            label: "名前",
            properties: {},
          },
        },
      ],
      schemaFields: [
        {
          fieldCode: "name" as FieldCode,
          fieldLabel: "名前",
          fieldType: "SINGLE_LINE_TEXT",
        },
      ],
      summary: { added: 0, modified: 1, deleted: 0, total: 1 },
      isEmpty: false,
      hasLayoutChanges: false,
    };

    printDiffResult(result);

    expect(p.log.info).toHaveBeenCalledWith(
      expect.stringContaining("~1 modified"),
    );
    expect(p.note).toHaveBeenCalledWith(
      expect.stringContaining("name"),
      "Diff Details",
      expect.objectContaining({ format: expect.any(Function) }),
    );
  });

  it("削除エントリがある場合、'-' プレフィックスと件数がログ出力される", () => {
    const result: DetectDiffOutput = {
      entries: [
        {
          type: "deleted",
          fieldCode: "old_field" as FieldCode,
          fieldLabel: "旧フィールド",
          details: "フィールドを削除",
          before: {
            code: "old_field" as FieldCode,
            type: "SINGLE_LINE_TEXT",
            label: "旧フィールド",
            properties: {},
          },
        },
      ],
      schemaFields: [],
      summary: { added: 0, modified: 0, deleted: 1, total: 1 },
      isEmpty: false,
      hasLayoutChanges: false,
    };

    printDiffResult(result);

    expect(p.log.info).toHaveBeenCalledWith(
      expect.stringContaining("-1 deleted"),
    );
    expect(p.note).toHaveBeenCalledWith(
      expect.stringContaining("old_field"),
      "Diff Details",
      expect.objectContaining({ format: expect.any(Function) }),
    );
  });

  it("レイアウト変更がある場合、'Layout changes detected.' とログ出力される", () => {
    const result: DetectDiffOutput = {
      entries: [],
      schemaFields: [
        {
          fieldCode: "name" as FieldCode,
          fieldLabel: "名前",
          fieldType: "SINGLE_LINE_TEXT",
        },
      ],
      summary: { added: 0, modified: 0, deleted: 0, total: 0 },
      isEmpty: false,
      hasLayoutChanges: true,
    };

    printDiffResult(result);

    expect(p.log.info).toHaveBeenCalledWith("Layout changes detected.");
  });

  it("追加・変更・削除が混在する場合、全種類のサマリーが1行にまとめて出力される", () => {
    const result: DetectDiffOutput = {
      entries: [
        {
          type: "added",
          fieldCode: "new1" as FieldCode,
          fieldLabel: "新規",
          details: "追加",
        },
        {
          type: "modified",
          fieldCode: "mod1" as FieldCode,
          fieldLabel: "変更",
          details: "変更",
        },
        {
          type: "deleted",
          fieldCode: "del1" as FieldCode,
          fieldLabel: "削除",
          details: "削除",
          before: {
            code: "del1" as FieldCode,
            type: "SINGLE_LINE_TEXT",
            label: "削除",
            properties: {},
          },
        },
      ],
      schemaFields: [],
      summary: { added: 1, modified: 1, deleted: 1, total: 3 },
      isEmpty: false,
      hasLayoutChanges: false,
    };

    printDiffResult(result);

    const changeLine = vi.mocked(p.log.info).mock.calls[0][0] as string;
    expect(changeLine).toContain("+1 added");
    expect(changeLine).toContain("~1 modified");
    expect(changeLine).toContain("-1 deleted");
  });

  it("差分エントリの details がノート内に表示される", () => {
    const result: DetectDiffOutput = {
      entries: [
        {
          type: "added",
          fieldCode: "email" as FieldCode,
          fieldLabel: "メール",
          details: "SINGLE_LINE_TEXT を追加",
        },
      ],
      schemaFields: [],
      summary: { added: 1, modified: 0, deleted: 0, total: 1 },
      isEmpty: false,
      hasLayoutChanges: false,
    };

    printDiffResult(result);

    expect(p.note).toHaveBeenCalledWith(
      expect.stringContaining("SINGLE_LINE_TEXT を追加"),
      "Diff Details",
      expect.objectContaining({ format: expect.any(Function) }),
    );
  });
});

describe("printViewDiffResult", () => {
  it("差分がない場合、'No changes detected.' とログ出力される", () => {
    const result: DiffResult<ViewDiffEntry> = {
      entries: [],
      summary: { added: 0, modified: 0, deleted: 0, total: 0 },
      isEmpty: true,
      warnings: [],
    };
    printViewDiffResult(result);
    expect(p.log.info).toHaveBeenCalledWith("No changes detected.");
    expect(p.note).not.toHaveBeenCalled();
  });

  it("追加エントリがある場合、'+N added' と 'View Diff Details' ノートが出力される", () => {
    const result: DiffResult<ViewDiffEntry> = {
      entries: [
        { type: "added", viewName: "一覧", details: "LIST view を追加" },
      ],
      summary: { added: 1, modified: 0, deleted: 0, total: 1 },
      isEmpty: false,
      warnings: [],
    };
    printViewDiffResult(result);
    expect(p.log.info).toHaveBeenCalledWith(
      expect.stringContaining("+1 added"),
    );
    expect(p.note).toHaveBeenCalledWith(
      expect.stringContaining("一覧"),
      "View Diff Details",
      expect.objectContaining({ format: expect.any(Function) }),
    );
  });

  it("変更エントリがある場合、'~N modified' がログ出力される", () => {
    const result: DiffResult<ViewDiffEntry> = {
      entries: [{ type: "modified", viewName: "一覧", details: "ソート変更" }],
      summary: { added: 0, modified: 1, deleted: 0, total: 1 },
      isEmpty: false,
      warnings: [],
    };
    printViewDiffResult(result);
    expect(p.log.info).toHaveBeenCalledWith(
      expect.stringContaining("~1 modified"),
    );
  });

  it("削除エントリがある場合、'-N deleted' がログ出力される", () => {
    const result: DiffResult<ViewDiffEntry> = {
      entries: [{ type: "deleted", viewName: "旧一覧", details: "削除" }],
      summary: { added: 0, modified: 0, deleted: 1, total: 1 },
      isEmpty: false,
      warnings: [],
    };
    printViewDiffResult(result);
    expect(p.log.info).toHaveBeenCalledWith(
      expect.stringContaining("-1 deleted"),
    );
  });

  it("追加・変更・削除が混在する場合、全種類のサマリーが出力される", () => {
    const result: DiffResult<ViewDiffEntry> = {
      entries: [
        { type: "added", viewName: "新規", details: "追加" },
        { type: "modified", viewName: "変更", details: "変更" },
        { type: "deleted", viewName: "削除", details: "削除" },
      ],
      summary: { added: 1, modified: 1, deleted: 1, total: 3 },
      isEmpty: false,
      warnings: [],
    };
    printViewDiffResult(result);
    const changeLine = vi.mocked(p.log.info).mock.calls[0][0] as string;
    expect(changeLine).toContain("+1 added");
    expect(changeLine).toContain("~1 modified");
    expect(changeLine).toContain("-1 deleted");
  });
});

describe("printProcessDiffResult", () => {
  it("差分がない場合、'No changes detected.' とログ出力される", () => {
    const result: DiffResult<ProcessManagementDiffEntry> = {
      entries: [],
      summary: { added: 0, modified: 0, deleted: 0, total: 0 },
      isEmpty: true,
      warnings: [],
    };
    printProcessDiffResult(result);
    expect(p.log.info).toHaveBeenCalledWith("No changes detected.");
    expect(p.note).not.toHaveBeenCalled();
  });

  it("追加エントリがある場合、'+N added' と 'Process Management Diff Details' ノートが出力される", () => {
    const result: DiffResult<ProcessManagementDiffEntry> = {
      entries: [
        {
          type: "added",
          category: "state",
          name: "処理中",
          details: "assignee: ONE",
        },
      ],
      summary: { added: 1, modified: 0, deleted: 0, total: 1 },
      isEmpty: false,
      warnings: [],
    };
    printProcessDiffResult(result);
    expect(p.log.info).toHaveBeenCalledWith(
      expect.stringContaining("+1 added"),
    );
    expect(p.note).toHaveBeenCalledWith(
      expect.stringContaining("処理中"),
      "Process Management Diff Details",
      expect.objectContaining({ format: expect.any(Function) }),
    );
  });

  it("変更エントリがある場合、'~N modified' がログ出力される", () => {
    const result: DiffResult<ProcessManagementDiffEntry> = {
      entries: [
        {
          type: "modified",
          category: "enable",
          name: "enable",
          details: "false -> true",
        },
      ],
      summary: { added: 0, modified: 1, deleted: 0, total: 1 },
      isEmpty: false,
      warnings: [],
    };
    printProcessDiffResult(result);
    expect(p.log.info).toHaveBeenCalledWith(
      expect.stringContaining("~1 modified"),
    );
  });

  it("削除エントリがある場合、'-N deleted' がログ出力される", () => {
    const result: DiffResult<ProcessManagementDiffEntry> = {
      entries: [
        {
          type: "deleted",
          category: "action",
          name: "承認",
          details: "未処理 -> 処理済",
        },
      ],
      summary: { added: 0, modified: 0, deleted: 1, total: 1 },
      isEmpty: false,
      warnings: [],
    };
    printProcessDiffResult(result);
    expect(p.log.info).toHaveBeenCalledWith(
      expect.stringContaining("-1 deleted"),
    );
  });
});

describe("printAppHeader", () => {
  it("アプリ名とIDを含むヘッダーが出力される", () => {
    printAppHeader("テストアプリ", "123");
    expect(p.log.step).toHaveBeenCalledWith(
      expect.stringContaining("テストアプリ"),
    );
    expect(p.log.step).toHaveBeenCalledWith(expect.stringContaining("123"));
  });
});

describe("printMultiAppResult", () => {
  it("succeeded の場合、成功メッセージが出力される", () => {
    const result: MultiAppResult = {
      results: [{ name: "App1" as AppName, status: "succeeded" }],
      hasFailure: false,
    };
    printMultiAppResult(result);
    expect(p.log.success).toHaveBeenCalledWith(
      expect.stringContaining("Succeeded"),
    );
    expect(p.log.success).toHaveBeenCalledWith(expect.stringContaining("App1"));
  });

  it("failed の場合、エラーメッセージと logError が呼ばれる", () => {
    const testError = new Error("test error");
    const result: MultiAppResult = {
      results: [
        { name: "App2" as AppName, status: "failed", error: testError },
      ],
      hasFailure: true,
    };
    printMultiAppResult(result);
    expect(p.log.error).toHaveBeenCalledWith(expect.stringContaining("Failed"));
    expect(p.log.error).toHaveBeenCalledWith(expect.stringContaining("App2"));
    expect(logError).toHaveBeenCalledWith(testError);
  });

  it("failed で error がない場合、エラーメッセージのみ出力される", () => {
    const result: MultiAppResult = {
      results: [{ name: "App3" as AppName, status: "failed" }],
      hasFailure: true,
    };
    printMultiAppResult(result);
    expect(p.log.error).toHaveBeenCalledWith(expect.stringContaining("Failed"));
    expect(logError).not.toHaveBeenCalled();
  });

  it("skipped の場合、スキップメッセージが出力される", () => {
    const result: MultiAppResult = {
      results: [{ name: "App4" as AppName, status: "skipped" }],
      hasFailure: false,
    };
    printMultiAppResult(result);
    expect(p.log.warn).toHaveBeenCalledWith(expect.stringContaining("Skipped"));
    expect(p.log.warn).toHaveBeenCalledWith(expect.stringContaining("App4"));
  });

  it("混合結果の場合、各ステータスに応じたメッセージが出力される", () => {
    const result: MultiAppResult = {
      results: [
        { name: "OK" as AppName, status: "succeeded" },
        { name: "NG" as AppName, status: "failed", error: new Error("fail") },
        { name: "Skip" as AppName, status: "skipped" },
      ],
      hasFailure: true,
    };
    printMultiAppResult(result);
    expect(p.log.success).toHaveBeenCalled();
    expect(p.log.error).toHaveBeenCalled();
    expect(p.log.warn).toHaveBeenCalled();
    expect(logError).toHaveBeenCalled();
  });
});

describe("promptDeploy", () => {
  it("ユーザーが確認を承認した場合、deployApp が呼ばれて成功メッセージが表示される", async () => {
    vi.mocked(p.confirm).mockResolvedValueOnce(true);
    vi.mocked(p.isCancel).mockReturnValueOnce(false);

    const container = {
      formConfigurator: {} as never,
      schemaStorage: {} as never,
      appDeployer: { deploy: vi.fn().mockResolvedValue(undefined) },
    };

    await promptDeploy(container, false);

    expect(container.appDeployer.deploy).toHaveBeenCalled();
    expect(p.log.success).toHaveBeenCalledWith(
      expect.stringContaining("Deployed to production"),
    );
  });

  it("ユーザーがキャンセルした場合、deployApp は呼ばれず警告が表示される", async () => {
    vi.mocked(p.confirm).mockResolvedValueOnce(false);
    vi.mocked(p.isCancel).mockReturnValueOnce(false);

    const container = {
      formConfigurator: {} as never,
      schemaStorage: {} as never,
      appDeployer: { deploy: vi.fn() },
    };

    await promptDeploy(container, false);

    expect(container.appDeployer.deploy).not.toHaveBeenCalled();
    expect(p.log.warn).toHaveBeenCalledWith(
      expect.stringContaining("not deployed to production"),
    );
  });

  it("ユーザーが Ctrl+C でキャンセルした場合、deployApp は呼ばれない", async () => {
    vi.mocked(p.confirm).mockResolvedValueOnce(Symbol("cancel") as never);
    vi.mocked(p.isCancel).mockReturnValueOnce(true);

    const container = {
      formConfigurator: {} as never,
      schemaStorage: {} as never,
      appDeployer: { deploy: vi.fn() },
    };

    await promptDeploy(container, false);

    expect(container.appDeployer.deploy).not.toHaveBeenCalled();
    expect(p.log.warn).toHaveBeenCalledWith(
      expect.stringContaining("not deployed to production"),
    );
  });

  it("skipConfirm が true の場合、確認なしで deployApp が呼ばれる", async () => {
    const container = {
      formConfigurator: {} as never,
      schemaStorage: {} as never,
      appDeployer: { deploy: vi.fn().mockResolvedValue(undefined) },
    };

    await promptDeploy(container, true);

    expect(p.confirm).not.toHaveBeenCalled();
    expect(container.appDeployer.deploy).toHaveBeenCalled();
    expect(p.log.success).toHaveBeenCalledWith(
      expect.stringContaining("Deployed to production"),
    );
  });
});

describe("confirmAndDeploy", () => {
  it("skipConfirm が true の場合、確認なしで全コンテナの deploy が呼ばれる", async () => {
    const containers = [
      { appDeployer: { deploy: vi.fn().mockResolvedValue(undefined) } },
      { appDeployer: { deploy: vi.fn().mockResolvedValue(undefined) } },
    ];

    await confirmAndDeploy(containers, true);

    expect(p.confirm).not.toHaveBeenCalled();
    expect(containers[0].appDeployer.deploy).toHaveBeenCalled();
    expect(containers[1].appDeployer.deploy).toHaveBeenCalled();
    expect(p.log.success).toHaveBeenCalledWith("Deployed to production.");
  });

  it("ユーザーが確認を承認した場合、全コンテナの deploy が呼ばれる", async () => {
    vi.mocked(p.confirm).mockResolvedValueOnce(true);
    vi.mocked(p.isCancel).mockReturnValueOnce(false);

    const containers = [
      { appDeployer: { deploy: vi.fn().mockResolvedValue(undefined) } },
    ];

    await confirmAndDeploy(containers, false);

    expect(p.confirm).toHaveBeenCalled();
    expect(containers[0].appDeployer.deploy).toHaveBeenCalled();
    expect(p.log.success).toHaveBeenCalledWith("Deployed to production.");
  });

  it("ユーザーがキャンセルした場合、deploy は呼ばれず警告が表示される", async () => {
    vi.mocked(p.confirm).mockResolvedValueOnce(false);
    vi.mocked(p.isCancel).mockReturnValueOnce(false);

    const containers = [{ appDeployer: { deploy: vi.fn() } }];

    await confirmAndDeploy(containers, false);

    expect(containers[0].appDeployer.deploy).not.toHaveBeenCalled();
    expect(p.log.warn).toHaveBeenCalledWith(
      expect.stringContaining("not deployed to production"),
    );
  });

  it("ユーザーが Ctrl+C でキャンセルした場合、deploy は呼ばれない", async () => {
    vi.mocked(p.confirm).mockResolvedValueOnce(Symbol("cancel") as never);
    vi.mocked(p.isCancel).mockReturnValueOnce(true);

    const containers = [{ appDeployer: { deploy: vi.fn() } }];

    await confirmAndDeploy(containers, false);

    expect(containers[0].appDeployer.deploy).not.toHaveBeenCalled();
    expect(p.log.warn).toHaveBeenCalledWith(
      expect.stringContaining("not deployed to production"),
    );
  });

  it("カスタム成功メッセージが指定された場合、そのメッセージが表示される", async () => {
    const containers = [
      { appDeployer: { deploy: vi.fn().mockResolvedValue(undefined) } },
    ];

    await confirmAndDeploy(containers, true, "Custom success!");

    expect(p.log.success).toHaveBeenCalledWith("Custom success!");
  });

  it("deploy エラー時にスピナーが停止しエラーが再スローされる", async () => {
    const deployError = new Error("deploy failed");
    const containers = [
      { appDeployer: { deploy: vi.fn().mockRejectedValue(deployError) } },
    ];

    await expect(confirmAndDeploy(containers, true)).rejects.toThrow(
      "deploy failed",
    );

    expect(p.log.success).not.toHaveBeenCalled();
  });

  it("空のコンテナ配列の場合、deploy なしで成功メッセージが表示される", async () => {
    await confirmAndDeploy([], true);

    expect(p.log.success).toHaveBeenCalledWith("Deployed to production.");
  });
});

describe("printAdminNotesDiffResult", () => {
  it("差分がない場合、'No changes detected.' とログ出力される", () => {
    const result: DiffResult<AdminNotesDiffEntry> = {
      entries: [],
      summary: { added: 0, modified: 0, deleted: 0, total: 0 },
      isEmpty: true,
      warnings: [],
    };
    printAdminNotesDiffResult(result);
    expect(p.log.info).toHaveBeenCalledWith("No changes detected.");
    expect(p.note).not.toHaveBeenCalled();
  });

  it("変更エントリがある場合、field 名と details が出力される", () => {
    const result: DiffResult<AdminNotesDiffEntry> = {
      entries: [
        { type: "modified", field: "content", details: "content changed" },
      ],
      summary: { added: 0, modified: 1, deleted: 0, total: 1 },
      isEmpty: false,
      warnings: [],
    };
    printAdminNotesDiffResult(result);
    expect(p.log.info).toHaveBeenCalledWith(
      expect.stringContaining("~1 modified"),
    );
    expect(p.note).toHaveBeenCalledWith(
      expect.stringContaining("content"),
      "Admin Notes Diff Details",
      expect.objectContaining({ format: expect.any(Function) }),
    );
  });
});

describe("printGeneralSettingsDiffResult", () => {
  it("差分がない場合、'No changes detected.' とログ出力される", () => {
    const result: DiffResult<GeneralSettingsDiffEntry> = {
      entries: [],
      summary: { added: 0, modified: 0, deleted: 0, total: 0 },
      isEmpty: true,
      warnings: [],
    };
    printGeneralSettingsDiffResult(result);
    expect(p.log.info).toHaveBeenCalledWith("No changes detected.");
    expect(p.note).not.toHaveBeenCalled();
  });

  it("変更エントリがある場合、field 名と details が出力される", () => {
    const result: DiffResult<GeneralSettingsDiffEntry> = {
      entries: [{ type: "modified", field: "name", details: '"old" -> "new"' }],
      summary: { added: 0, modified: 1, deleted: 0, total: 1 },
      isEmpty: false,
      warnings: [],
    };
    printGeneralSettingsDiffResult(result);
    expect(p.log.info).toHaveBeenCalledWith(
      expect.stringContaining("~1 modified"),
    );
    expect(p.note).toHaveBeenCalledWith(
      expect.stringContaining("name"),
      "General Settings Diff Details",
      expect.objectContaining({ format: expect.any(Function) }),
    );
  });
});

describe("printAppPermissionDiffResult", () => {
  it("差分がない場合、'No changes detected.' とログ出力される", () => {
    const result: DiffResult<AppPermissionDiffEntry> = {
      entries: [],
      summary: { added: 0, modified: 0, deleted: 0, total: 0 },
      isEmpty: true,
      warnings: [],
    };
    printAppPermissionDiffResult(result);
    expect(p.log.info).toHaveBeenCalledWith("No changes detected.");
    expect(p.note).not.toHaveBeenCalled();
  });

  it("追加・削除が混在する場合、entityKey が出力される", () => {
    const result: DiffResult<AppPermissionDiffEntry> = {
      entries: [
        {
          type: "added",
          entityKey: "USER:admin",
          details: "recordViewable",
        },
        {
          type: "deleted",
          entityKey: "GROUP:dev",
          details: "no permissions",
        },
      ],
      summary: { added: 1, modified: 0, deleted: 1, total: 2 },
      isEmpty: false,
      warnings: [],
    };
    printAppPermissionDiffResult(result);
    const noteContent = vi.mocked(p.note).mock.calls[0][0] as string;
    expect(noteContent).toContain("USER:admin");
    expect(noteContent).toContain("GROUP:dev");
  });
});

describe("printFieldPermissionDiffResult", () => {
  it("差分がない場合、'No changes detected.' とログ出力される", () => {
    const result: DiffResult<FieldPermissionDiffEntry> = {
      entries: [],
      summary: { added: 0, modified: 0, deleted: 0, total: 0 },
      isEmpty: true,
      warnings: [],
    };
    printFieldPermissionDiffResult(result);
    expect(p.log.info).toHaveBeenCalledWith("No changes detected.");
    expect(p.note).not.toHaveBeenCalled();
  });

  it("変更エントリがある場合、fieldCode が出力される", () => {
    const result: DiffResult<FieldPermissionDiffEntry> = {
      entries: [
        { type: "modified", fieldCode: "email", details: "entities changed" },
      ],
      summary: { added: 0, modified: 1, deleted: 0, total: 1 },
      isEmpty: false,
      warnings: [],
    };
    printFieldPermissionDiffResult(result);
    expect(p.note).toHaveBeenCalledWith(
      expect.stringContaining("email"),
      "Field Permission Diff Details",
      expect.objectContaining({ format: expect.any(Function) }),
    );
  });
});

describe("printCustomizationDiffResult", () => {
  it("差分がない場合、'No changes detected.' とログ出力される", () => {
    const result: DiffResult<CustomizationDiffEntry> = {
      entries: [],
      summary: { added: 0, modified: 0, deleted: 0, total: 0 },
      isEmpty: true,
      warnings: [],
    };
    printCustomizationDiffResult(result);
    expect(p.log.info).toHaveBeenCalledWith("No changes detected.");
    expect(p.note).not.toHaveBeenCalled();
  });

  it("platform が 'config' の場合、resourceType のみが location として表示される", () => {
    const result: DiffResult<CustomizationDiffEntry> = {
      entries: [
        {
          type: "modified",
          platform: "config",
          resourceType: "scope",
          name: "scope",
          details: "ALL -> ADMIN",
        },
      ],
      summary: { added: 0, modified: 1, deleted: 0, total: 1 },
      isEmpty: false,
      warnings: [],
    };
    printCustomizationDiffResult(result);
    const noteContent = vi.mocked(p.note).mock.calls[0][0] as string;
    expect(noteContent).toContain("scope");
    expect(noteContent).not.toContain("config.scope");
  });

  it("platform が 'desktop' の場合、platform.resourceType が location として表示される", () => {
    const result: DiffResult<CustomizationDiffEntry> = {
      entries: [
        {
          type: "added",
          platform: "desktop",
          resourceType: "js",
          name: "app.js",
          details: "new resource",
        },
      ],
      summary: { added: 1, modified: 0, deleted: 0, total: 1 },
      isEmpty: false,
      warnings: [],
    };
    printCustomizationDiffResult(result);
    const noteContent = vi.mocked(p.note).mock.calls[0][0] as string;
    expect(noteContent).toContain("desktop.js");
    expect(noteContent).toContain("app.js");
  });

  it("warning entries は summary に含まれず p.log.warn で出力される", () => {
    const result: DiffResult<CustomizationDiffEntry> = {
      entries: [
        {
          type: "added",
          platform: "desktop",
          resourceType: "js",
          name: "app.js",
          details: "new resource",
        },
      ],
      summary: { added: 1, modified: 0, deleted: 0, total: 1 },
      isEmpty: false,
      warnings: [
        "[desktop.js] duplicate basenames detected; diff results may be inaccurate for FILE resources",
      ],
    };
    printCustomizationDiffResult(result);
    expect(p.log.warn).toHaveBeenCalledWith(
      expect.stringContaining("duplicate basenames"),
    );
    const infoCall = vi
      .mocked(p.log.info)
      .mock.calls.find(
        (c) => typeof c[0] === "string" && c[0].includes("Changes:"),
      );
    expect(infoCall).toBeDefined();
    expect(infoCall?.[0]).not.toContain("~1");
    const noteContent = vi.mocked(p.note).mock.calls[0][0] as string;
    expect(noteContent).not.toContain("(warning)");
  });
});

describe("printNotificationDiffResult", () => {
  it("差分がない場合、'No changes detected.' とログ出力される", () => {
    const result: DiffResult<NotificationDiffEntry> = {
      entries: [],
      summary: { added: 0, modified: 0, deleted: 0, total: 0 },
      isEmpty: true,
      warnings: [],
    };
    printNotificationDiffResult(result);
    expect(p.log.info).toHaveBeenCalledWith("No changes detected.");
    expect(p.note).not.toHaveBeenCalled();
  });

  it("セクション名と通知名が出力される", () => {
    const result: DiffResult<NotificationDiffEntry> = {
      entries: [
        {
          type: "added",
          section: "general",
          name: "USER:user1",
          details: "new notification",
        },
        {
          type: "deleted",
          section: "perRecord",
          name: "Test",
          details: "removed",
        },
      ],
      summary: { added: 1, modified: 0, deleted: 1, total: 2 },
      isEmpty: false,
      warnings: [],
    };
    printNotificationDiffResult(result);
    const noteContent = vi.mocked(p.note).mock.calls[0][0] as string;
    expect(noteContent).toContain("general");
    expect(noteContent).toContain("perRecord");
  });
});

describe("printActionDiffResult", () => {
  it("差分がない場合、'No changes detected.' とログ出力される", () => {
    const result: DiffResult<ActionDiffEntry> = {
      entries: [],
      summary: { added: 0, modified: 0, deleted: 0, total: 0 },
      isEmpty: true,
      warnings: [],
    };
    printActionDiffResult(result);
    expect(p.log.info).toHaveBeenCalledWith("No changes detected.");
    expect(p.note).not.toHaveBeenCalled();
  });

  it("アクション名と details が出力される", () => {
    const result: DiffResult<ActionDiffEntry> = {
      entries: [
        { type: "added", actionName: "copyAction", details: "dest: 42" },
      ],
      summary: { added: 1, modified: 0, deleted: 0, total: 1 },
      isEmpty: false,
      warnings: [],
    };
    printActionDiffResult(result);
    expect(p.note).toHaveBeenCalledWith(
      expect.stringContaining("copyAction"),
      "Action Diff Details",
      expect.objectContaining({ format: expect.any(Function) }),
    );
  });
});

describe("printPluginDiffResult", () => {
  it("差分がない場合、'No changes detected.' とログ出力される", () => {
    const result: DiffResult<PluginDiffEntry> = {
      entries: [],
      summary: { added: 0, modified: 0, deleted: 0, total: 0 },
      isEmpty: true,
      warnings: [],
    };
    printPluginDiffResult(result);
    expect(p.log.info).toHaveBeenCalledWith("No changes detected.");
    expect(p.note).not.toHaveBeenCalled();
  });

  it("pluginId と details が出力される", () => {
    const result: DiffResult<PluginDiffEntry> = {
      entries: [
        {
          type: "deleted",
          pluginId: "com.example.plugin",
          details: '"My Plugin"',
        },
      ],
      summary: { added: 0, modified: 0, deleted: 1, total: 1 },
      isEmpty: false,
      warnings: [],
    };
    printPluginDiffResult(result);
    expect(p.note).toHaveBeenCalledWith(
      expect.stringContaining("com.example.plugin"),
      "Plugin Diff Details",
      expect.objectContaining({ format: expect.any(Function) }),
    );
  });
});

describe("printRecordPermissionDiffResult", () => {
  it("差分がない場合、'No changes detected.' とログ出力される", () => {
    const result: DiffResult<RecordPermissionDiffEntry> = {
      entries: [],
      summary: { added: 0, modified: 0, deleted: 0, total: 0 },
      isEmpty: true,
      warnings: [],
    };
    printRecordPermissionDiffResult(result);
    expect(p.log.info).toHaveBeenCalledWith("No changes detected.");
    expect(p.note).not.toHaveBeenCalled();
  });

  it("filterCond が空の場合、'(all records)' が表示される", () => {
    const result: DiffResult<RecordPermissionDiffEntry> = {
      entries: [{ type: "added", filterCond: "", details: "entities: 2" }],
      summary: { added: 1, modified: 0, deleted: 0, total: 1 },
      isEmpty: false,
      warnings: [],
    };
    printRecordPermissionDiffResult(result);
    const noteContent = vi.mocked(p.note).mock.calls[0][0] as string;
    expect(noteContent).toContain("(all records)");
  });

  it("filterCond がある場合、そのまま表示される", () => {
    const result: DiffResult<RecordPermissionDiffEntry> = {
      entries: [
        {
          type: "modified",
          filterCond: 'status = "active"',
          details: "entities changed",
        },
      ],
      summary: { added: 0, modified: 1, deleted: 0, total: 1 },
      isEmpty: false,
      warnings: [],
    };
    printRecordPermissionDiffResult(result);
    const noteContent = vi.mocked(p.note).mock.calls[0][0] as string;
    expect(noteContent).toContain('status = "active"');
  });
});

describe("printReportDiffResult", () => {
  it("差分がない場合、'No changes detected.' とログ出力される", () => {
    const result: DiffResult<ReportDiffEntry> = {
      entries: [],
      summary: { added: 0, modified: 0, deleted: 0, total: 0 },
      isEmpty: true,
      warnings: [],
    };
    printReportDiffResult(result);
    expect(p.log.info).toHaveBeenCalledWith("No changes detected.");
    expect(p.note).not.toHaveBeenCalled();
  });

  it("レポート名と details が出力される", () => {
    const result: DiffResult<ReportDiffEntry> = {
      entries: [
        {
          type: "added",
          reportName: "Sales Report",
          details: "chartType: TABLE",
        },
      ],
      summary: { added: 1, modified: 0, deleted: 0, total: 1 },
      isEmpty: false,
      warnings: [],
    };
    printReportDiffResult(result);
    expect(p.note).toHaveBeenCalledWith(
      expect.stringContaining("Sales Report"),
      "Report Diff Details",
      expect.objectContaining({ format: expect.any(Function) }),
    );
  });
});
