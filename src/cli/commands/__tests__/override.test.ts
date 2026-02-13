import { beforeEach, describe, expect, it, vi } from "vitest";

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
  multiAppArgs: {},
  resolveConfig: vi.fn(() => ({
    baseUrl: "https://test.cybozu.com",
    username: "user",
    password: "pass",
    appId: "1",
    schemaFilePath: "schema.yaml",
  })),
}));

vi.mock("@/cli/projectConfig", () => ({
  resolveTarget: vi.fn(() => ({ mode: "single-legacy" })),
  printAvailableApps: vi.fn(),
  resolveAppCliConfig: vi.fn(),
  routeMultiApp: vi.fn(
    async (
      _values: unknown,
      handlers: { singleLegacy: () => Promise<void> },
    ) => {
      await handlers.singleLegacy();
    },
  ),
  runMultiAppWithFailCheck: vi.fn(),
}));

vi.mock("@/core/application/container/cli", () => ({
  createCliContainer: vi.fn(() => ({})),
}));

vi.mock("@/core/application/formSchema/forceOverrideForm");
vi.mock("@/core/application/formSchema/resetForm");

vi.mock("@/cli/output", () => ({
  printDiffResult: vi.fn(),
  printAppHeader: vi.fn(),
  printMultiAppResult: vi.fn(),
  promptDeploy: vi.fn(),
}));

vi.mock("@/cli/handleError", () => ({
  handleCliError: vi.fn(),
}));

import * as p from "@clack/prompts";
import { handleCliError } from "@/cli/handleError";
import { promptDeploy } from "@/cli/output";
import { forceOverrideForm } from "@/core/application/formSchema/forceOverrideForm";
import { resetForm } from "@/core/application/formSchema/resetForm";
import command from "../override";

// process.exit をモック（throwして後続の実行を止める）
const exitSpy = vi.spyOn(process, "exit").mockImplementation(((
  _code?: number,
) => {
  throw new Error("process.exit");
}) as never);

beforeEach(() => {
  vi.clearAllMocks();
  // process.exit mock を再設定
  exitSpy.mockImplementation(((_code?: number) => {
    throw new Error("process.exit");
  }) as never);
  // デフォルトのモック実装を再設定
  vi.mocked(p.isCancel).mockReturnValue(false);
});

describe("override コマンド", () => {
  it("強制上書き前に警告メッセージが表示される", async () => {
    vi.mocked(p.confirm).mockResolvedValue(true);
    vi.mocked(forceOverrideForm).mockResolvedValue(undefined);
    vi.mocked(promptDeploy).mockResolvedValue(undefined);

    await command.run({ values: {} } as never);

    expect(p.log.warn).toHaveBeenCalledWith(expect.stringContaining("WARNING"));
    expect(p.log.warn).toHaveBeenCalledWith(expect.stringContaining("deleted"));
  });

  it("ユーザーが確認した場合、強制上書きが実行される", async () => {
    vi.mocked(p.confirm).mockResolvedValue(true);
    vi.mocked(forceOverrideForm).mockResolvedValue(undefined);
    vi.mocked(promptDeploy).mockResolvedValue(undefined);

    await command.run({ values: {} } as never);

    expect(forceOverrideForm).toHaveBeenCalled();
    expect(p.log.success).toHaveBeenCalledWith(
      expect.stringContaining("Force override completed"),
    );
  });

  it("強制上書き成功後、デプロイの確認が行われる", async () => {
    vi.mocked(p.confirm).mockResolvedValue(true);
    vi.mocked(forceOverrideForm).mockResolvedValue(undefined);
    vi.mocked(promptDeploy).mockResolvedValue(undefined);

    await command.run({ values: {} } as never);

    expect(promptDeploy).toHaveBeenCalled();
  });

  it("ユーザーがキャンセルした場合、強制上書きは実行されない", async () => {
    vi.mocked(p.confirm).mockResolvedValue(false);

    await command.run({ values: {} } as never);

    expect(p.cancel).toHaveBeenCalledWith(expect.stringContaining("cancelled"));
    expect(exitSpy).toHaveBeenCalledWith(0);
    expect(forceOverrideForm).not.toHaveBeenCalled();
  });

  it("ユーザーがCtrl+Cでキャンセルした場合、強制上書きは実行されない", async () => {
    vi.mocked(p.confirm).mockResolvedValue(Symbol.for("cancel") as never);
    vi.mocked(p.isCancel).mockReturnValue(true);

    await command.run({ values: {} } as never);

    expect(p.cancel).toHaveBeenCalled();
    expect(exitSpy).toHaveBeenCalledWith(0);
    expect(forceOverrideForm).not.toHaveBeenCalled();
  });

  it("強制上書き中にエラーが発生した場合、handleCliErrorで処理される", async () => {
    vi.mocked(p.confirm).mockResolvedValue(true);
    const error = new Error("Override failed");
    vi.mocked(forceOverrideForm).mockRejectedValue(error);

    await command.run({ values: {} } as never);

    expect(handleCliError).toHaveBeenCalledWith(error);
    expect(promptDeploy).not.toHaveBeenCalled();
  });
});

describe("override --reset コマンド", () => {
  it("--reset 指定時にリセット専用の警告メッセージが表示される", async () => {
    vi.mocked(p.confirm).mockResolvedValue(true);
    vi.mocked(resetForm).mockResolvedValue(undefined);
    vi.mocked(promptDeploy).mockResolvedValue(undefined);

    await command.run({ values: { reset: true } } as never);

    expect(p.log.warn).toHaveBeenCalledWith(expect.stringContaining("WARNING"));
    expect(p.log.warn).toHaveBeenCalledWith(
      expect.stringContaining("delete ALL custom fields"),
    );
  });

  it("--reset 指定時に resetForm が呼ばれ forceOverrideForm は呼ばれない", async () => {
    vi.mocked(p.confirm).mockResolvedValue(true);
    vi.mocked(resetForm).mockResolvedValue(undefined);
    vi.mocked(promptDeploy).mockResolvedValue(undefined);

    await command.run({ values: { reset: true } } as never);

    expect(resetForm).toHaveBeenCalled();
    expect(forceOverrideForm).not.toHaveBeenCalled();
  });

  it("--reset 指定かつユーザーキャンセル時に resetForm は呼ばれない", async () => {
    vi.mocked(p.confirm).mockResolvedValue(false);

    await command.run({ values: { reset: true } } as never);

    expect(p.cancel).toHaveBeenCalledWith(expect.stringContaining("cancelled"));
    expect(exitSpy).toHaveBeenCalledWith(0);
    expect(resetForm).not.toHaveBeenCalled();
  });

  it("--reset 指定時にデプロイの確認が行われる", async () => {
    vi.mocked(p.confirm).mockResolvedValue(true);
    vi.mocked(resetForm).mockResolvedValue(undefined);
    vi.mocked(promptDeploy).mockResolvedValue(undefined);

    await command.run({ values: { reset: true } } as never);

    expect(promptDeploy).toHaveBeenCalled();
  });

  it("--reset と --schema-file の同時指定で handleCliError が呼ばれる", async () => {
    await command.run({
      values: { reset: true, "schema-file": "schema.yaml" },
    } as never);

    expect(handleCliError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining(
          "--reset and --schema-file cannot be used together",
        ),
      }),
    );
  });
});
