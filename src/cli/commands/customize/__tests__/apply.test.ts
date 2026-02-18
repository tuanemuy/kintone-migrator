import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@clack/prompts", () => ({
  spinner: vi.fn(() => ({ start: vi.fn(), stop: vi.fn() })),
  log: {
    info: vi.fn(),
    success: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    step: vi.fn(),
    message: vi.fn(),
  },
  outro: vi.fn(),
  confirm: vi.fn(),
  isCancel: vi.fn(),
  cancel: vi.fn(),
}));

vi.mock("@/cli/config", () => ({
  kintoneArgs: {},
  multiAppArgs: {},
  confirmArgs: {},
  resolveConfig: vi.fn(() => ({
    baseUrl: "https://test.cybozu.com",
    auth: { type: "password", username: "user", password: "pass" },
    appId: "1",
    schemaFilePath: "schema.yaml",
  })),
}));

vi.mock("@/core/application/container/cli", () => ({
  createCustomizationCliContainer: vi.fn(() => ({
    appDeployer: { deploy: vi.fn().mockResolvedValue(undefined) },
  })),
}));

vi.mock("@/core/application/customization/applyCustomization");

vi.mock("@/cli/output", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/cli/output")>()),
  printDiffResult: vi.fn(),
  printAppHeader: vi.fn(),
  printMultiAppResult: vi.fn(),
  promptDeploy: vi.fn(),
}));

vi.mock("@/cli/handleError", () => ({
  handleCliError: vi.fn(),
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
  resolveAppCliConfig: vi.fn(),
  runMultiAppWithFailCheck: vi.fn(),
}));

import * as p from "@clack/prompts";
import { handleCliError } from "@/cli/handleError";
import { createCustomizationCliContainer } from "@/core/application/container/cli";
import { applyCustomization } from "@/core/application/customization/applyCustomization";
import command from "../apply";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("customize apply コマンド", () => {
  it("カスタマイズ適用成功時、成功メッセージが表示される", async () => {
    vi.mocked(applyCustomization).mockResolvedValue(undefined);

    await command.run({ values: { yes: true } } as never);

    expect(applyCustomization).toHaveBeenCalled();
    expect(p.log.success).toHaveBeenCalledWith(
      expect.stringContaining("successfully"),
    );
  });

  it("yes未指定の場合、デプロイ確認が行われる", async () => {
    vi.mocked(applyCustomization).mockResolvedValue(undefined);
    vi.mocked(p.confirm).mockResolvedValue(true);

    await command.run({ values: {} } as never);

    expect(p.confirm).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.any(String) }),
    );
    const container = vi.mocked(createCustomizationCliContainer).mock.results[0]
      ?.value;
    expect(container.appDeployer.deploy).toHaveBeenCalled();
  });

  it("ユーザーがデプロイをキャンセルした場合、deployは呼ばれず警告が表示される", async () => {
    vi.mocked(applyCustomization).mockResolvedValue(undefined);
    vi.mocked(p.confirm).mockResolvedValue(false);

    await command.run({ values: {} } as never);

    const container = vi.mocked(createCustomizationCliContainer).mock.results[0]
      ?.value;
    expect(container.appDeployer.deploy).not.toHaveBeenCalled();
    expect(p.log.warn).toHaveBeenCalledWith(
      expect.stringContaining("not deployed to production"),
    );
  });

  it("ユーザーがCtrl+Cでキャンセルした場合、deployは呼ばれない", async () => {
    vi.mocked(applyCustomization).mockResolvedValue(undefined);
    vi.mocked(p.confirm).mockResolvedValue(Symbol.for("cancel") as never);
    vi.mocked(p.isCancel).mockReturnValue(true);

    await command.run({ values: {} } as never);

    const container = vi.mocked(createCustomizationCliContainer).mock.results[0]
      ?.value;
    expect(container.appDeployer.deploy).not.toHaveBeenCalled();
  });

  it("エラー発生時にhandleCliErrorで処理される", async () => {
    const error = new Error("Customization failed");
    vi.mocked(applyCustomization).mockRejectedValue(error);

    await command.run({ values: { yes: true } } as never);

    expect(handleCliError).toHaveBeenCalledWith(error);
  });

  it("エラー発生時にデプロイは行われない", async () => {
    const error = new Error("Customization failed");
    vi.mocked(applyCustomization).mockRejectedValue(error);

    await command.run({ values: {} } as never);

    expect(p.confirm).not.toHaveBeenCalled();
  });
});
