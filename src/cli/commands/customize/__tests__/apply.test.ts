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

describe("customize apply command", () => {
  it("should apply customization on success", async () => {
    vi.mocked(applyCustomization).mockResolvedValue(undefined);

    await command.run({ values: { yes: true } } as never);

    expect(applyCustomization).toHaveBeenCalled();
  });

  it("should prompt for diff confirmation and deploy confirmation when --yes is not set", async () => {
    vi.mocked(applyCustomization).mockResolvedValue(undefined);
    vi.mocked(p.confirm).mockResolvedValue(true);

    await command.run({ values: {} } as never);

    // First confirm: "Apply these changes?", second confirm: "Deploy to production?"
    expect(p.confirm).toHaveBeenCalledTimes(2);
    const container = vi.mocked(createCustomizationCliContainer).mock.results[0]
      ?.value;
    expect(container.appDeployer.deploy).toHaveBeenCalled();
  });

  it("should not deploy when user cancels deploy confirmation", async () => {
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

  it("should not apply or deploy when user cancels apply confirmation", async () => {
    vi.mocked(p.confirm).mockResolvedValue(false);

    await command.run({ values: {} } as never);

    expect(applyCustomization).not.toHaveBeenCalled();
    expect(p.cancel).toHaveBeenCalledWith("Apply cancelled.");
  });

  it("should handle errors through handleCliError", async () => {
    const error = new Error("Customization failed");
    vi.mocked(applyCustomization).mockRejectedValue(error);

    await command.run({ values: { yes: true } } as never);

    expect(handleCliError).toHaveBeenCalledWith(error);
  });

  it("should not deploy when apply fails", async () => {
    const error = new Error("Customization failed");
    vi.mocked(applyCustomization).mockRejectedValue(error);

    await command.run({ values: { yes: true } } as never);

    const container = vi.mocked(createCustomizationCliContainer).mock.results[0]
      ?.value;
    expect(container.appDeployer.deploy).not.toHaveBeenCalled();
  });

  describe("diff-based skip detection", () => {
    it("should skip apply when diff reports no changes (isEmpty is true)", async () => {
      const { detectCustomizationDiff } = await import(
        "@/core/application/customization/detectCustomizationDiff"
      );
      vi.mocked(detectCustomizationDiff).mockResolvedValueOnce({
        entries: [],
        summary: { added: 0, modified: 0, deleted: 0, total: 0 },
        isEmpty: true,
        warnings: [],
      });

      await command.run({ values: { yes: true } } as never);

      expect(applyCustomization).not.toHaveBeenCalled();
      expect(p.log.success).toHaveBeenCalledWith("No changes detected.");
    });

    it("should apply when diff reports modified FILE content", async () => {
      const { detectCustomizationDiff } = await import(
        "@/core/application/customization/detectCustomizationDiff"
      );
      vi.mocked(detectCustomizationDiff).mockResolvedValueOnce({
        entries: [
          {
            type: "modified",
            platform: "desktop",
            category: "js",
            name: "app.js",
            details: "file content changed",
          },
        ],
        summary: { added: 0, modified: 1, deleted: 0, total: 1 },
        isEmpty: false,
        warnings: [],
      });
      vi.mocked(applyCustomization).mockResolvedValue(undefined);

      await command.run({ values: { yes: true } } as never);

      expect(applyCustomization).toHaveBeenCalled();
    });
  });
});
