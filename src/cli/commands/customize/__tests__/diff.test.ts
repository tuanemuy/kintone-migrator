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
  printThreeWayDiffResult: vi.fn(),
}));

vi.mock("@/core/application/container/cli", () => ({
  createCustomizationCliContainer: vi.fn(() => ({})),
}));

vi.mock("@/core/application/customization/detectCustomizationThreeWayDiff");

vi.mock("@/cli/handleError", () => ({
  handleCliError: vi.fn(),
}));

import { handleCliError } from "@/cli/handleError";
import { printThreeWayDiffResult } from "@/cli/output";
import { detectCustomizationThreeWayDiff } from "@/core/application/customization/detectCustomizationThreeWayDiff";
import command from "../diff";

afterEach(() => {
  vi.clearAllMocks();
});

describe("customize diff command", () => {
  it("should detect a 3-way diff and print the result", async () => {
    const mockResult = {
      mode: "three-way" as const,
      localChanges: [
        {
          key: "desktop:js:app.js",
          label: "desktop:js:app.js",
          kind: "localOnly" as const,
        },
      ],
      remoteDrift: [],
      conflicts: [],
      extras: [],
      isEmpty: false,
    };
    vi.mocked(detectCustomizationThreeWayDiff).mockResolvedValue(mockResult);

    await command.run({ values: {} } as never);

    expect(detectCustomizationThreeWayDiff).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({ basePath: expect.any(String) }),
      }),
    );
    expect(printThreeWayDiffResult).toHaveBeenCalledWith(
      mockResult,
      expect.any(Function),
    );
  });

  it("should fall back to a two-way result when no state exists", async () => {
    const mockResult = {
      mode: "two-way" as const,
      diff: {
        entries: [],
        summary: { added: 0, modified: 0, deleted: 0, total: 0 },
        isEmpty: true,
        warnings: [],
      },
    };
    vi.mocked(detectCustomizationThreeWayDiff).mockResolvedValue(mockResult);

    await command.run({ values: {} } as never);

    expect(printThreeWayDiffResult).toHaveBeenCalledWith(
      mockResult,
      expect.any(Function),
    );
  });

  it("should handle errors with handleCliError", async () => {
    const error = new Error("Diff failed");
    vi.mocked(detectCustomizationThreeWayDiff).mockRejectedValue(error);

    await command.run({ values: {} } as never);

    expect(handleCliError).toHaveBeenCalledWith(error);
  });

  it("should pass basePath derived from customizeFilePath", async () => {
    const mockResult = {
      mode: "two-way" as const,
      diff: {
        entries: [],
        summary: { added: 0, modified: 0, deleted: 0, total: 0 },
        isEmpty: true,
        warnings: [],
      },
    };
    vi.mocked(detectCustomizationThreeWayDiff).mockResolvedValue(mockResult);

    await command.run({ values: {} } as never);

    const call = vi.mocked(detectCustomizationThreeWayDiff).mock.calls[0];
    expect(call?.[0]).toHaveProperty("input.basePath");
    expect(typeof call?.[0]?.input?.basePath).toBe("string");
  });
});
