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
  confirm: vi.fn(),
  isCancel: vi.fn(() => false),
  cancel: vi.fn(),
}));

vi.mock("@/cli/config", () => ({
  kintoneArgs: {},
  multiAppArgs: {},
  resolveConfig: vi.fn(() => ({
    baseUrl: "https://test.cybozu.com",
    auth: { username: "user", password: "pass" },
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
  createSeedCliContainer: vi.fn(() => ({})),
}));

vi.mock("@/core/application/seedData/captureSeed");
vi.mock("@/core/application/seedData/saveSeed");

vi.mock("@/cli/handleError", () => ({
  handleCliError: vi.fn(),
}));

vi.mock("@/cli/output", () => ({
  printAppHeader: vi.fn(),
}));

import * as p from "@clack/prompts";
import { handleCliError } from "@/cli/handleError";
import { captureSeed } from "@/core/application/seedData/captureSeed";
import { saveSeed } from "@/core/application/seedData/saveSeed";
import command from "../capture";

afterEach(() => {
  vi.clearAllMocks();
});

describe("seed capture コマンド", () => {
  it("--key-fieldでcaptureモードを実行する", async () => {
    vi.mocked(captureSeed).mockResolvedValue({
      seedText: 'records:\n  - code: "001"\n',
      recordCount: 1,
      hasExistingSeed: false,
    });
    vi.mocked(saveSeed).mockResolvedValue(undefined);

    await command.run({
      values: { "key-field": "code" },
    } as never);

    expect(captureSeed).toHaveBeenCalled();
    expect(saveSeed).toHaveBeenCalled();
  });

  it("captureモードで既存ファイルがある場合に上書き警告を表示する", async () => {
    vi.mocked(captureSeed).mockResolvedValue({
      seedText: "records:\n",
      recordCount: 0,
      hasExistingSeed: true,
    });
    vi.mocked(saveSeed).mockResolvedValue(undefined);

    await command.run({
      values: { "key-field": "code" },
    } as never);

    expect(p.log.warn).toHaveBeenCalledWith(
      expect.stringContaining("overwritten"),
    );
  });

  it("--key-fieldがない場合にエラーをスローする", async () => {
    await command.run({
      values: {},
    } as never);

    expect(handleCliError).toHaveBeenCalled();
    expect(captureSeed).not.toHaveBeenCalled();
  });

  it("エラー発生時にhandleCliErrorで処理される", async () => {
    const error = new Error("API error");
    vi.mocked(captureSeed).mockRejectedValue(error);

    await command.run({
      values: { "key-field": "code" },
    } as never);

    expect(handleCliError).toHaveBeenCalledWith(error);
  });
});
