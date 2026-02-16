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

vi.mock("@/cli/fieldAclConfig", () => ({
  fieldAclArgs: {},
  resolveFieldAclContainerConfig: vi.fn(() => ({
    baseUrl: "https://test.cybozu.com",
    auth: { type: "password", username: "user", password: "pass" },
    appId: "1",
    fieldAclFilePath: "field-acl.yaml",
  })),
  resolveFieldAclAppContainerConfig: vi.fn(),
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

vi.mock("@/core/application/container/cli", () => ({
  createFieldPermissionCliContainer: vi.fn(() => ({})),
}));

vi.mock("@/core/application/fieldPermission/captureFieldPermission");
vi.mock("@/core/application/fieldPermission/saveFieldPermission");

vi.mock("@/cli/handleError", () => ({
  handleCliError: vi.fn(),
}));

import * as p from "@clack/prompts";
import { handleCliError } from "@/cli/handleError";
import { captureFieldPermission } from "@/core/application/fieldPermission/captureFieldPermission";
import { saveFieldPermission } from "@/core/application/fieldPermission/saveFieldPermission";
import command from "../capture";

afterEach(() => {
  vi.clearAllMocks();
});

describe("field-acl capture コマンド", () => {
  it("フィールド権限をキャプチャしてファイルに保存する", async () => {
    vi.mocked(captureFieldPermission).mockResolvedValue({
      configText: "rights:\n  - code: name\n",
      hasExistingConfig: false,
    });
    vi.mocked(saveFieldPermission).mockResolvedValue(undefined);

    await command.run({ values: {} } as never);

    expect(captureFieldPermission).toHaveBeenCalled();
    expect(saveFieldPermission).toHaveBeenCalledWith(
      expect.objectContaining({
        input: { configText: "rights:\n  - code: name\n" },
      }),
    );
  });

  it("保存成功時にファイルパスを含む成功メッセージが表示される", async () => {
    vi.mocked(captureFieldPermission).mockResolvedValue({
      configText: "rights:\n",
      hasExistingConfig: false,
    });
    vi.mocked(saveFieldPermission).mockResolvedValue(undefined);

    await command.run({ values: {} } as never);

    expect(p.log.success).toHaveBeenCalledWith(
      expect.stringContaining("field-acl.yaml"),
    );
  });

  it("既存設定を上書きした場合、警告メッセージが表示される", async () => {
    vi.mocked(captureFieldPermission).mockResolvedValue({
      configText: "rights:\n",
      hasExistingConfig: true,
    });
    vi.mocked(saveFieldPermission).mockResolvedValue(undefined);

    await command.run({ values: {} } as never);

    expect(p.log.warn).toHaveBeenCalledWith(
      expect.stringContaining("overwritten"),
    );
  });

  it("既存設定がない場合、上書き警告は表示されない", async () => {
    vi.mocked(captureFieldPermission).mockResolvedValue({
      configText: "rights:\n",
      hasExistingConfig: false,
    });
    vi.mocked(saveFieldPermission).mockResolvedValue(undefined);

    await command.run({ values: {} } as never);

    expect(p.log.warn).not.toHaveBeenCalled();
  });

  it("エラー発生時にhandleCliErrorで処理される", async () => {
    const error = new Error("API error");
    vi.mocked(captureFieldPermission).mockRejectedValue(error);

    await command.run({ values: {} } as never);

    expect(handleCliError).toHaveBeenCalledWith(error);
    expect(saveFieldPermission).not.toHaveBeenCalled();
  });
});
