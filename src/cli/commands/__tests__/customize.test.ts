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
  resolveConfig: vi.fn(() => ({
    baseUrl: "https://test.cybozu.com",
    username: "user",
    password: "pass",
    appId: "1",
    customizeFilePath: "/project/customize.yaml",
  })),
}));

vi.mock("@/core/application/container/cli", () => ({
  createCliContainer: vi.fn(() => ({})),
}));

vi.mock("@/core/application/customization/applyCustomization");

vi.mock("@/cli/output", () => ({
  printDiffResult: vi.fn(),
  promptDeploy: vi.fn(),
}));

vi.mock("@/cli/handleError", () => ({
  handleCliError: vi.fn(),
}));

import * as p from "@clack/prompts";
import { handleCliError } from "@/cli/handleError";
import { promptDeploy } from "@/cli/output";
import { applyCustomization } from "@/core/application/customization/applyCustomization";
import command from "../customize";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("customize コマンド", () => {
  it("カスタマイズ適用成功時、成功メッセージが表示される", async () => {
    vi.mocked(applyCustomization).mockResolvedValue(undefined);
    vi.mocked(promptDeploy).mockResolvedValue(undefined);

    await command.run({ values: {} } as never);

    expect(applyCustomization).toHaveBeenCalled();
    expect(p.log.success).toHaveBeenCalledWith(
      expect.stringContaining("successfully"),
    );
  });

  it("カスタマイズ適用成功後、デプロイの確認が行われる", async () => {
    vi.mocked(applyCustomization).mockResolvedValue(undefined);
    vi.mocked(promptDeploy).mockResolvedValue(undefined);

    await command.run({ values: {} } as never);

    expect(promptDeploy).toHaveBeenCalled();
  });

  it("エラー発生時にhandleCliErrorで処理される", async () => {
    const error = new Error("Customization failed");
    vi.mocked(applyCustomization).mockRejectedValue(error);

    await command.run({ values: {} } as never);

    expect(handleCliError).toHaveBeenCalledWith(error);
    expect(promptDeploy).not.toHaveBeenCalled();
  });
});
