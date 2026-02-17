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

vi.mock("@/cli/recordAclConfig", () => ({
  recordAclArgs: {},
  resolveRecordAclContainerConfig: vi.fn(() => ({
    baseUrl: "https://test.cybozu.com",
    auth: { type: "password", username: "user", password: "pass" },
    appId: "1",
    recordAclFilePath: "record-acl.yaml",
  })),
  resolveRecordAclAppContainerConfig: vi.fn(),
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

vi.mock("@/core/application/container/recordPermissionCli", () => ({
  createRecordPermissionCliContainer: vi.fn(() => ({})),
}));

vi.mock("@/core/application/recordPermission/captureRecordPermission");
vi.mock("@/core/application/recordPermission/saveRecordPermission");

vi.mock("@/cli/handleError", () => ({
  handleCliError: vi.fn(),
}));

import * as p from "@clack/prompts";
import { handleCliError } from "@/cli/handleError";
import { captureRecordPermission } from "@/core/application/recordPermission/captureRecordPermission";
import { saveRecordPermission } from "@/core/application/recordPermission/saveRecordPermission";
import command from "../capture";

afterEach(() => {
  vi.clearAllMocks();
});

describe("record-acl capture コマンド", () => {
  it("レコード権限をキャプチャしてファイルに保存する", async () => {
    vi.mocked(captureRecordPermission).mockResolvedValue({
      configText: 'rights:\n  - filterCond: ""\n',
      hasExistingConfig: false,
    });
    vi.mocked(saveRecordPermission).mockResolvedValue(undefined);

    await command.run({ values: {} } as never);

    expect(captureRecordPermission).toHaveBeenCalled();
    expect(saveRecordPermission).toHaveBeenCalledWith(
      expect.objectContaining({
        input: { configText: 'rights:\n  - filterCond: ""\n' },
      }),
    );
  });

  it("保存成功時にファイルパスを含む成功メッセージが表示される", async () => {
    vi.mocked(captureRecordPermission).mockResolvedValue({
      configText: "rights:\n",
      hasExistingConfig: false,
    });
    vi.mocked(saveRecordPermission).mockResolvedValue(undefined);

    await command.run({ values: {} } as never);

    expect(p.log.success).toHaveBeenCalledWith(
      expect.stringContaining("record-acl.yaml"),
    );
  });

  it("既存設定を上書きした場合、警告メッセージが表示される", async () => {
    vi.mocked(captureRecordPermission).mockResolvedValue({
      configText: "rights:\n",
      hasExistingConfig: true,
    });
    vi.mocked(saveRecordPermission).mockResolvedValue(undefined);

    await command.run({ values: {} } as never);

    expect(p.log.warn).toHaveBeenCalledWith(
      expect.stringContaining("overwritten"),
    );
  });

  it("既存設定がない場合、上書き警告は表示されない", async () => {
    vi.mocked(captureRecordPermission).mockResolvedValue({
      configText: "rights:\n",
      hasExistingConfig: false,
    });
    vi.mocked(saveRecordPermission).mockResolvedValue(undefined);

    await command.run({ values: {} } as never);

    expect(p.log.warn).not.toHaveBeenCalled();
  });

  it("エラー発生時にhandleCliErrorで処理される", async () => {
    const error = new Error("API error");
    vi.mocked(captureRecordPermission).mockRejectedValue(error);

    await command.run({ values: {} } as never);

    expect(handleCliError).toHaveBeenCalledWith(error);
    expect(saveRecordPermission).not.toHaveBeenCalled();
  });
});
