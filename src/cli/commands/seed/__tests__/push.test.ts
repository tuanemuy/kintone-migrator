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
  confirmArgs: {},
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

vi.mock("@/core/application/seedData/upsertSeed");

vi.mock("@/cli/handleError", () => ({
  handleCliError: vi.fn(),
}));

vi.mock("@/cli/output", () => ({
  printAppHeader: vi.fn(),
}));

import * as p from "@clack/prompts";
import { handleCliError } from "@/cli/handleError";
import { upsertSeed } from "@/core/application/seedData/upsertSeed";
import command from "../push";

afterEach(() => {
  vi.clearAllMocks();
});

describe("seed push コマンド", () => {
  it("warning なしで upsert を実行する", async () => {
    vi.mocked(upsertSeed).mockResolvedValue({
      added: 2,
      updated: 0,
      unchanged: 0,
      deleted: 0,
      total: 2,
    });

    await command.run({ values: {} } as never);

    expect(upsertSeed).toHaveBeenCalledWith(
      expect.objectContaining({
        input: { clean: false },
      }),
    );
    expect(p.log.warn).not.toHaveBeenCalledWith(
      expect.stringContaining("deprecated"),
    );
  });

  it("upsert結果のサマリーを表示する", async () => {
    vi.mocked(upsertSeed).mockResolvedValue({
      added: 1,
      updated: 2,
      unchanged: 3,
      deleted: 0,
      total: 6,
    });

    await command.run({ values: {} } as never);

    expect(p.log.info).toHaveBeenCalledWith(expect.stringContaining("added"));
    expect(p.log.info).toHaveBeenCalledWith(expect.stringContaining("updated"));
  });

  it("エラー発生時にhandleCliErrorで処理される", async () => {
    const error = new Error("API error");
    vi.mocked(upsertSeed).mockRejectedValue(error);

    await command.run({ values: {} } as never);

    expect(handleCliError).toHaveBeenCalledWith(error);
  });
});
