import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@clack/prompts", () => ({
  spinner: vi.fn(() => ({ start: vi.fn(), stop: vi.fn() })),
  log: {
    info: vi.fn(),
    success: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
  outro: vi.fn(),
}));

vi.mock("@/cli/adminNotesConfig", () => ({
  adminNotesArgs: {},
  resolveAdminNotesContainerConfig: vi.fn(() => ({
    baseUrl: "https://test.cybozu.com",
    auth: { type: "password", username: "user", password: "pass" },
    appId: "1",
    adminNotesFilePath: "admin-notes.yaml",
  })),
  resolveAdminNotesAppContainerConfig: vi.fn(),
}));

vi.mock("@/cli/projectConfig", () => ({
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

vi.mock("@/cli/output", () => ({
  printAppHeader: vi.fn(),
}));

vi.mock("@/core/application/container/adminNotesCli", () => ({
  createAdminNotesCliContainer: vi.fn(() => ({})),
}));

vi.mock("@/core/application/adminNotes/captureAdminNotes");
vi.mock("@/core/application/adminNotes/saveAdminNotes");

vi.mock("@/cli/handleError", () => ({
  handleCliError: vi.fn(),
}));

import * as p from "@clack/prompts";
import { handleCliError } from "@/cli/handleError";
import { captureAdminNotes } from "@/core/application/adminNotes/captureAdminNotes";
import { saveAdminNotes } from "@/core/application/adminNotes/saveAdminNotes";
import command from "../capture";

afterEach(() => {
  vi.clearAllMocks();
});

describe("admin-notes capture コマンド", () => {
  it("管理者用メモをキャプチャしてファイルに保存する", async () => {
    vi.mocked(captureAdminNotes).mockResolvedValue({
      configText: "content: test\nincludeInTemplateAndDuplicates: true\n",
      hasExistingConfig: false,
    });
    vi.mocked(saveAdminNotes).mockResolvedValue(undefined);

    await command.run({ values: {} } as never);

    expect(captureAdminNotes).toHaveBeenCalled();
    expect(saveAdminNotes).toHaveBeenCalledWith(
      expect.objectContaining({
        input: {
          configText: "content: test\nincludeInTemplateAndDuplicates: true\n",
        },
      }),
    );
  });

  it("保存成功時にファイルパスを含む成功メッセージが表示される", async () => {
    vi.mocked(captureAdminNotes).mockResolvedValue({
      configText: "content: test\n",
      hasExistingConfig: false,
    });
    vi.mocked(saveAdminNotes).mockResolvedValue(undefined);

    await command.run({ values: {} } as never);

    expect(p.log.success).toHaveBeenCalledWith(
      expect.stringContaining("admin-notes.yaml"),
    );
  });

  it("既存設定を上書きした場合、警告メッセージが表示される", async () => {
    vi.mocked(captureAdminNotes).mockResolvedValue({
      configText: "content: test\n",
      hasExistingConfig: true,
    });
    vi.mocked(saveAdminNotes).mockResolvedValue(undefined);

    await command.run({ values: {} } as never);

    expect(p.log.warn).toHaveBeenCalledWith(
      expect.stringContaining("overwritten"),
    );
  });

  it("既存設定がない場合、上書き警告は表示されない", async () => {
    vi.mocked(captureAdminNotes).mockResolvedValue({
      configText: "content: test\n",
      hasExistingConfig: false,
    });
    vi.mocked(saveAdminNotes).mockResolvedValue(undefined);

    await command.run({ values: {} } as never);

    expect(p.log.warn).not.toHaveBeenCalled();
  });

  it("エラー発生時にhandleCliErrorで処理される", async () => {
    const error = new Error("API error");
    vi.mocked(captureAdminNotes).mockRejectedValue(error);

    await command.run({ values: {} } as never);

    expect(handleCliError).toHaveBeenCalledWith(error);
    expect(saveAdminNotes).not.toHaveBeenCalled();
  });
});
