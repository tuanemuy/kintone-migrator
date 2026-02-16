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

vi.mock("@/core/application/formSchema/captureSchema");
vi.mock("@/core/application/formSchema/saveSchema");

vi.mock("@/cli/handleError", () => ({
  handleCliError: vi.fn(),
}));

import * as p from "@clack/prompts";
import { handleCliError } from "@/cli/handleError";
import { captureSchema } from "@/core/application/formSchema/captureSchema";
import { saveSchema } from "@/core/application/formSchema/saveSchema";
import command from "../capture";

afterEach(() => {
  vi.clearAllMocks();
});

describe("capture コマンド", () => {
  it("現在のフォーム設定をキャプチャしてファイルに保存する", async () => {
    vi.mocked(captureSchema).mockResolvedValue({
      schemaText: "layout:\n  - type: ROW\n",
      hasExistingSchema: false,
    });
    vi.mocked(saveSchema).mockResolvedValue(undefined);

    await command.run({ values: {} } as never);

    expect(captureSchema).toHaveBeenCalled();
    expect(saveSchema).toHaveBeenCalledWith(
      expect.objectContaining({
        input: { schemaText: "layout:\n  - type: ROW\n" },
      }),
    );
  });

  it("保存成功時にファイルパスを含む成功メッセージが表示される", async () => {
    vi.mocked(captureSchema).mockResolvedValue({
      schemaText: "layout:\n",
      hasExistingSchema: false,
    });
    vi.mocked(saveSchema).mockResolvedValue(undefined);

    await command.run({ values: {} } as never);

    expect(p.log.success).toHaveBeenCalledWith(
      expect.stringContaining("schema.yaml"),
    );
  });

  it("既存スキーマを上書きした場合、警告メッセージが表示される", async () => {
    vi.mocked(captureSchema).mockResolvedValue({
      schemaText: "layout:\n",
      hasExistingSchema: true,
    });
    vi.mocked(saveSchema).mockResolvedValue(undefined);

    await command.run({ values: {} } as never);

    expect(p.log.warn).toHaveBeenCalledWith(
      expect.stringContaining("overwritten"),
    );
  });

  it("既存スキーマがない場合、上書き警告は表示されない", async () => {
    vi.mocked(captureSchema).mockResolvedValue({
      schemaText: "layout:\n",
      hasExistingSchema: false,
    });
    vi.mocked(saveSchema).mockResolvedValue(undefined);

    await command.run({ values: {} } as never);

    expect(p.log.warn).not.toHaveBeenCalled();
  });

  it("エラー発生時にhandleCliErrorで処理される", async () => {
    const error = new Error("API error");
    vi.mocked(captureSchema).mockRejectedValue(error);

    await command.run({ values: {} } as never);

    expect(handleCliError).toHaveBeenCalledWith(error);
    expect(saveSchema).not.toHaveBeenCalled();
  });
});
