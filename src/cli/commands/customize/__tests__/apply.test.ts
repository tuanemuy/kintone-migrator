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
  note: vi.fn(),
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

vi.mock("@/core/application/customization/detectCustomizationDiff", () => ({
  detectCustomizationDiff: vi.fn().mockResolvedValue({
    entries: [
      {
        type: "added",
        platform: "desktop",
        category: "js",
        name: "app.js",
        details: "new FILE resource",
      },
    ],
    summary: { added: 1, modified: 0, deleted: 0, total: 1 },
    isEmpty: false,
    warnings: [],
  }),
}));

vi.mock("@/cli/output", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/cli/output")>()),
  printDiffResult: vi.fn(),
  printCustomizationDiffResult: vi.fn(),
  printAppHeader: vi.fn(),
  printMultiAppResult: vi.fn(),
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
  runMultiAppWithHeaders: vi.fn(),
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
  });

  it("yes未指定の場合、diff確認とデプロイ確認が行われる", async () => {
    vi.mocked(applyCustomization).mockResolvedValue(undefined);
    vi.mocked(p.confirm).mockResolvedValue(true);

    await command.run({ values: {} } as never);

    // First confirm: "Apply these changes?", second confirm: "Deploy to production?"
    expect(p.confirm).toHaveBeenCalledTimes(2);
    const container = vi.mocked(createCustomizationCliContainer).mock.results[0]
      ?.value;
    expect(container.appDeployer.deploy).toHaveBeenCalled();
  });

  it("ユーザーがデプロイをキャンセルした場合、deployは呼ばれず警告が表示される", async () => {
    vi.mocked(applyCustomization).mockResolvedValue(undefined);
    // First confirm: accept apply, second confirm: reject deploy
    vi.mocked(p.confirm)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);

    await command.run({ values: {} } as never);

    const container = vi.mocked(createCustomizationCliContainer).mock.results[0]
      ?.value;
    expect(container.appDeployer.deploy).not.toHaveBeenCalled();
    expect(p.log.warn).toHaveBeenCalledWith(
      expect.stringContaining("not deployed to production"),
    );
  });

  it("ユーザーがapply確認をキャンセルした場合、applyもdeployも呼ばれない", async () => {
    vi.mocked(p.confirm).mockResolvedValue(false);

    await command.run({ values: {} } as never);

    expect(applyCustomization).not.toHaveBeenCalled();
    expect(p.cancel).toHaveBeenCalledWith("Apply cancelled.");
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

    await command.run({ values: { yes: true } } as never);

    const container = vi.mocked(createCustomizationCliContainer).mock.results[0]
      ?.value;
    expect(container.appDeployer.deploy).not.toHaveBeenCalled();
  });

  it("FILEリソースのcontent変更警告がある場合、diffが空でもapplyをスキップしない", async () => {
    const { detectCustomizationDiff } = await import(
      "@/core/application/customization/detectCustomizationDiff"
    );
    vi.mocked(detectCustomizationDiff).mockResolvedValueOnce({
      entries: [],
      summary: { added: 0, modified: 0, deleted: 0, total: 0 },
      isEmpty: true,
      warnings: [
        "[desktop.js] FILE resources are compared by name only; content changes are not detected",
      ],
    });
    vi.mocked(applyCustomization).mockResolvedValue(undefined);

    await command.run({ values: { yes: true } } as never);

    expect(applyCustomization).toHaveBeenCalled();
  });
});
