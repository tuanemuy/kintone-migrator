import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DetectDiffOutput } from "@/core/application/formSchema/dto";

vi.mock("@clack/prompts", () => ({
  spinner: vi.fn(() => ({ start: vi.fn(), stop: vi.fn() })),
  log: {
    info: vi.fn(),
    success: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
  outro: vi.fn(),
  confirm: vi.fn(),
  isCancel: vi.fn(),
  cancel: vi.fn(),
}));

vi.mock("@/cli/config", () => ({
  kintoneArgs: {},
  resolveConfig: vi.fn(() => ({
    baseUrl: "https://test.cybozu.com",
    username: "user",
    password: "pass",
    appId: "1",
    schemaFilePath: "schema.yaml",
  })),
}));

vi.mock("@/core/application/container/cli", () => ({
  createCliContainer: vi.fn(() => ({})),
}));

vi.mock("@/core/application/formSchema/detectDiff");
vi.mock("@/core/application/formSchema/executeMigration");

vi.mock("@/cli/output", () => ({
  printDiffResult: vi.fn(),
  promptDeploy: vi.fn(),
}));

vi.mock("@/cli/handleError", () => ({
  handleCliError: vi.fn(),
}));

import * as p from "@clack/prompts";
import { handleCliError } from "@/cli/handleError";
import { printDiffResult, promptDeploy } from "@/cli/output";
import { detectDiff } from "@/core/application/formSchema/detectDiff";
import { executeMigration } from "@/core/application/formSchema/executeMigration";
import command from "../migrate";

// process.exit をモック（throwして後続の実行を止める）
const exitSpy = vi.spyOn(process, "exit").mockImplementation(((
  _code?: number,
) => {
  throw new Error("process.exit");
}) as never);

beforeEach(() => {
  vi.clearAllMocks();
  // process.exit mock を再設定（clearAllMocksで実装が消えるため）
  exitSpy.mockImplementation(((_code?: number) => {
    throw new Error("process.exit");
  }) as never);
  // デフォルトのモック実装を再設定
  vi.mocked(p.isCancel).mockReturnValue(false);
});

function noDiffResult(): DetectDiffOutput {
  return {
    entries: [],
    schemaFields: [],
    summary: { added: 0, modified: 0, deleted: 0, total: 0 },
    isEmpty: true,
    hasLayoutChanges: false,
  };
}

function hasDiffResult(): DetectDiffOutput {
  return {
    entries: [
      {
        type: "added",
        fieldCode: "name",
        fieldLabel: "名前",
        details: "新規追加",
        after: {
          code: "name",
          type: "SINGLE_LINE_TEXT",
          label: "名前",
          properties: {},
        },
      },
    ],
    schemaFields: [
      { fieldCode: "name", fieldLabel: "名前", fieldType: "SINGLE_LINE_TEXT" },
    ],
    summary: { added: 1, modified: 0, deleted: 0, total: 1 },
    isEmpty: false,
    hasLayoutChanges: false,
  };
}

describe("migrate コマンド", () => {
  it("差分がない場合、変更不要メッセージを表示して終了する", async () => {
    vi.mocked(detectDiff).mockResolvedValue(noDiffResult());

    await command.run({ values: {} } as never);

    expect(p.log.success).toHaveBeenCalledWith(
      expect.stringContaining("No changes detected"),
    );
    expect(executeMigration).not.toHaveBeenCalled();
    expect(p.confirm).not.toHaveBeenCalled();
  });

  it("差分がある場合、差分を表示してユーザーに確認を求める", async () => {
    const result = hasDiffResult();
    vi.mocked(detectDiff).mockResolvedValue(result);
    vi.mocked(p.confirm).mockResolvedValue(true);
    vi.mocked(executeMigration).mockResolvedValue(undefined);
    vi.mocked(promptDeploy).mockResolvedValue(undefined);

    await command.run({ values: {} } as never);

    expect(printDiffResult).toHaveBeenCalledWith(result);
    expect(p.confirm).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.any(String) }),
    );
  });

  it("ユーザーが確認した場合、マイグレーションを実行する", async () => {
    vi.mocked(detectDiff).mockResolvedValue(hasDiffResult());
    vi.mocked(p.confirm).mockResolvedValue(true);
    vi.mocked(executeMigration).mockResolvedValue(undefined);
    vi.mocked(promptDeploy).mockResolvedValue(undefined);

    await command.run({ values: {} } as never);

    expect(executeMigration).toHaveBeenCalled();
    expect(p.log.success).toHaveBeenCalledWith(
      expect.stringContaining("Migration completed"),
    );
  });

  it("マイグレーション成功後、デプロイの確認が行われる", async () => {
    vi.mocked(detectDiff).mockResolvedValue(hasDiffResult());
    vi.mocked(p.confirm).mockResolvedValue(true);
    vi.mocked(executeMigration).mockResolvedValue(undefined);
    vi.mocked(promptDeploy).mockResolvedValue(undefined);

    await command.run({ values: {} } as never);

    expect(promptDeploy).toHaveBeenCalled();
  });

  it("ユーザーがキャンセルした場合、マイグレーションは実行されない", async () => {
    vi.mocked(detectDiff).mockResolvedValue(hasDiffResult());
    vi.mocked(p.confirm).mockResolvedValue(false);

    await command.run({ values: {} } as never);

    expect(p.cancel).toHaveBeenCalledWith(expect.stringContaining("cancelled"));
    expect(exitSpy).toHaveBeenCalledWith(0);
    expect(executeMigration).not.toHaveBeenCalled();
  });

  it("ユーザーがCtrl+Cでキャンセルした場合、マイグレーションは実行されない", async () => {
    vi.mocked(detectDiff).mockResolvedValue(hasDiffResult());
    vi.mocked(p.confirm).mockResolvedValue(Symbol.for("cancel") as never);
    vi.mocked(p.isCancel).mockReturnValue(true);

    await command.run({ values: {} } as never);

    expect(p.cancel).toHaveBeenCalled();
    expect(exitSpy).toHaveBeenCalledWith(0);
    expect(executeMigration).not.toHaveBeenCalled();
  });

  it("差分検出中にエラーが発生した場合、handleCliErrorで処理される", async () => {
    const error = new Error("API error");
    vi.mocked(detectDiff).mockRejectedValue(error);

    await command.run({ values: {} } as never);

    expect(handleCliError).toHaveBeenCalledWith(error);
    expect(executeMigration).not.toHaveBeenCalled();
  });

  it("マイグレーション実行中にエラーが発生した場合、handleCliErrorで処理される", async () => {
    vi.mocked(detectDiff).mockResolvedValue(hasDiffResult());
    vi.mocked(p.confirm).mockResolvedValue(true);
    const error = new Error("Migration failed");
    vi.mocked(executeMigration).mockRejectedValue(error);

    await command.run({ values: {} } as never);

    expect(handleCliError).toHaveBeenCalledWith(error);
    expect(promptDeploy).not.toHaveBeenCalled();
  });
});
