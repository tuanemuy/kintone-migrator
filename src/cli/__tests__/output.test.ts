import { afterEach, describe, expect, it, vi } from "vitest";
import type { DetectDiffOutput } from "@/core/application/formSchema/dto";

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
import type { DiffProcessManagementOutput } from "@/core/application/processManagement/diffProcessManagement";
import type { DetectViewDiffOutput } from "@/core/application/view/dto";
import type { MultiAppResult } from "@/core/domain/projectConfig/entity";
import type { AppName } from "@/core/domain/projectConfig/valueObject";
import { logError } from "../handleError";
import {
  printAppHeader,
  printDiffResult,
  printMultiAppResult,
  printProcessDiffResult,
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
          fieldCode: "name",
          fieldLabel: "名前",
          details: "SINGLE_LINE_TEXT を追加",
        },
      ],
      schemaFields: [
        {
          fieldCode: "name",
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
          fieldCode: "name",
          fieldLabel: "名前",
          details: "ラベルが変更されました",
          before: {
            code: "name",
            type: "SINGLE_LINE_TEXT",
            label: "旧名前",
            properties: {},
          },
          after: {
            code: "name",
            type: "SINGLE_LINE_TEXT",
            label: "名前",
            properties: {},
          },
        },
      ],
      schemaFields: [
        {
          fieldCode: "name",
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
          fieldCode: "old_field",
          fieldLabel: "旧フィールド",
          details: "フィールドを削除",
          before: {
            code: "old_field",
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
          fieldCode: "name",
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
          fieldCode: "new1",
          fieldLabel: "新規",
          details: "追加",
        },
        {
          type: "modified",
          fieldCode: "mod1",
          fieldLabel: "変更",
          details: "変更",
        },
        {
          type: "deleted",
          fieldCode: "del1",
          fieldLabel: "削除",
          details: "削除",
          before: {
            code: "del1",
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
          fieldCode: "email",
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
    const result: DetectViewDiffOutput = {
      entries: [],
      summary: { added: 0, modified: 0, deleted: 0, total: 0 },
      isEmpty: true,
    };
    printViewDiffResult(result);
    expect(p.log.info).toHaveBeenCalledWith("No changes detected.");
    expect(p.note).not.toHaveBeenCalled();
  });

  it("追加エントリがある場合、'+N added' と 'View Diff Details' ノートが出力される", () => {
    const result: DetectViewDiffOutput = {
      entries: [
        { type: "added", viewName: "一覧", details: "LIST view を追加" },
      ],
      summary: { added: 1, modified: 0, deleted: 0, total: 1 },
      isEmpty: false,
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
    const result: DetectViewDiffOutput = {
      entries: [{ type: "modified", viewName: "一覧", details: "ソート変更" }],
      summary: { added: 0, modified: 1, deleted: 0, total: 1 },
      isEmpty: false,
    };
    printViewDiffResult(result);
    expect(p.log.info).toHaveBeenCalledWith(
      expect.stringContaining("~1 modified"),
    );
  });

  it("削除エントリがある場合、'-N deleted' がログ出力される", () => {
    const result: DetectViewDiffOutput = {
      entries: [{ type: "deleted", viewName: "旧一覧", details: "削除" }],
      summary: { added: 0, modified: 0, deleted: 1, total: 1 },
      isEmpty: false,
    };
    printViewDiffResult(result);
    expect(p.log.info).toHaveBeenCalledWith(
      expect.stringContaining("-1 deleted"),
    );
  });

  it("追加・変更・削除が混在する場合、全種類のサマリーが出力される", () => {
    const result: DetectViewDiffOutput = {
      entries: [
        { type: "added", viewName: "新規", details: "追加" },
        { type: "modified", viewName: "変更", details: "変更" },
        { type: "deleted", viewName: "削除", details: "削除" },
      ],
      summary: { added: 1, modified: 1, deleted: 1, total: 3 },
      isEmpty: false,
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
    const result: DiffProcessManagementOutput = {
      entries: [],
      summary: { added: 0, modified: 0, deleted: 0 },
      isEmpty: true,
    };
    printProcessDiffResult(result);
    expect(p.log.info).toHaveBeenCalledWith("No changes detected.");
    expect(p.note).not.toHaveBeenCalled();
  });

  it("追加エントリがある場合、'+N added' と 'Process Management Diff Details' ノートが出力される", () => {
    const result: DiffProcessManagementOutput = {
      entries: [
        {
          type: "added",
          category: "state",
          name: "処理中",
          details: "assignee: ONE",
        },
      ],
      summary: { added: 1, modified: 0, deleted: 0 },
      isEmpty: false,
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
    const result: DiffProcessManagementOutput = {
      entries: [
        {
          type: "modified",
          category: "enable",
          name: "enable",
          details: "false -> true",
        },
      ],
      summary: { added: 0, modified: 1, deleted: 0 },
      isEmpty: false,
    };
    printProcessDiffResult(result);
    expect(p.log.info).toHaveBeenCalledWith(
      expect.stringContaining("~1 modified"),
    );
  });

  it("削除エントリがある場合、'-N deleted' がログ出力される", () => {
    const result: DiffProcessManagementOutput = {
      entries: [
        {
          type: "deleted",
          category: "action",
          name: "承認",
          details: "未処理 -> 処理済",
        },
      ],
      summary: { added: 0, modified: 0, deleted: 1 },
      isEmpty: false,
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
