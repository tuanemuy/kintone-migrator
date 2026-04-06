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

vi.mock("@/cli/customizeConfig", () => ({
  customizeArgs: {},
  resolveCustomizeConfig: vi.fn(() => ({
    baseUrl: "https://test.cybozu.com",
    auth: { type: "password", username: "user", password: "pass" },
    appId: "1",
    customizeFilePath: "customize.yaml",
  })),
  resolveCustomizeAppConfig: vi.fn(),
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
  printCustomizationDiffResult: vi.fn(),
}));

vi.mock("@/core/application/container/cli", () => ({
  createCustomizationCliContainer: vi.fn(() => ({})),
}));

vi.mock("@/core/application/customization/detectCustomizationDiff");

vi.mock("@/cli/handleError", () => ({
  handleCliError: vi.fn(),
}));

import { handleCliError } from "@/cli/handleError";
import { printCustomizationDiffResult } from "@/cli/output";
import { detectCustomizationDiff } from "@/core/application/customization/detectCustomizationDiff";
import command from "../diff";

afterEach(() => {
  vi.clearAllMocks();
});

describe("customize diff command", () => {
  it("should detect diff and print result", async () => {
    const mockResult = {
      entries: [
        {
          type: "modified" as const,
          platform: "desktop" as const,
          category: "js" as const,
          name: "app.js",
          details: "file content changed",
        },
      ],
      summary: { added: 0, modified: 1, deleted: 0, total: 1 },
      isEmpty: false,
      warnings: [],
    };
    vi.mocked(detectCustomizationDiff).mockResolvedValue(mockResult);

    await command.run({ values: {} } as never);

    expect(detectCustomizationDiff).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({ basePath: expect.any(String) }),
      }),
    );
    expect(printCustomizationDiffResult).toHaveBeenCalledWith(mockResult);
  });

  it("should print empty result when no diff", async () => {
    const mockResult = {
      entries: [],
      summary: { added: 0, modified: 0, deleted: 0, total: 0 },
      isEmpty: true,
      warnings: [],
    };
    vi.mocked(detectCustomizationDiff).mockResolvedValue(mockResult);

    await command.run({ values: {} } as never);

    expect(printCustomizationDiffResult).toHaveBeenCalledWith(mockResult);
  });

  it("should handle errors with handleCliError", async () => {
    const error = new Error("Diff failed");
    vi.mocked(detectCustomizationDiff).mockRejectedValue(error);

    await command.run({ values: {} } as never);

    expect(handleCliError).toHaveBeenCalledWith(error);
  });

  it("should pass basePath derived from customizeFilePath", async () => {
    const mockResult = {
      entries: [],
      summary: { added: 0, modified: 0, deleted: 0, total: 0 },
      isEmpty: true,
      warnings: [],
    };
    vi.mocked(detectCustomizationDiff).mockResolvedValue(mockResult);

    await command.run({ values: {} } as never);

    const call = vi.mocked(detectCustomizationDiff).mock.calls[0];
    expect(call?.[0]).toHaveProperty("input.basePath");
    expect(typeof call?.[0]?.input?.basePath).toBe("string");
  });
});
