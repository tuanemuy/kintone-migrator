import { afterEach, describe, expect, it, vi } from "vitest";
import type { DetectSchemaThreeWayDiffOutput } from "@/core/application/formSchema/detectThreeWayDiff";

vi.mock("@clack/prompts", () => ({
  spinner: vi.fn(() => ({ start: vi.fn(), stop: vi.fn() })),
  log: {
    info: vi.fn(),
    success: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
  outro: vi.fn(),
  note: vi.fn(),
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
    stateSchemaFilePath: "state/schema.yaml",
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

vi.mock("@/core/application/formSchema/detectThreeWayDiff");

vi.mock("@/cli/output", () => ({
  printThreeWayDiffResult: vi.fn(),
  printDiffResult: vi.fn(),
  printAppHeader: vi.fn(),
  printMultiAppResult: vi.fn(),
}));

vi.mock("@/cli/handleError", () => ({
  handleCliError: vi.fn(),
}));

import { handleCliError } from "@/cli/handleError";
import { printThreeWayDiffResult } from "@/cli/output";
import { detectThreeWayDiff } from "@/core/application/formSchema/detectThreeWayDiff";
import command from "../diff";

afterEach(() => {
  vi.clearAllMocks();
});

function twoWayResult(): DetectSchemaThreeWayDiffOutput {
  return {
    mode: "two-way",
    diff: {
      entries: [],
      schemaFields: [],
      summary: { added: 0, modified: 0, deleted: 0, total: 0 },
      isEmpty: true,
      hasLayoutChanges: false,
    },
  };
}

function threeWayResult(): DetectSchemaThreeWayDiffOutput {
  return {
    mode: "three-way",
    localChanges: [{ key: "name", label: "名前", kind: "localOnly" }],
    remoteDrift: [],
    conflicts: [],
    extras: [],
    isEmpty: false,
  };
}

describe("diff コマンド", () => {
  it("state がない場合、2-way 結果が printer に渡される", async () => {
    const mockResult = twoWayResult();
    vi.mocked(detectThreeWayDiff).mockResolvedValue(mockResult);

    await command.run({ values: {} } as never);

    expect(detectThreeWayDiff).toHaveBeenCalled();
    expect(printThreeWayDiffResult).toHaveBeenCalledWith(
      mockResult,
      expect.any(Function),
    );
  });

  it("state がある場合、3-way 結果が printer に渡される", async () => {
    const mockResult = threeWayResult();
    vi.mocked(detectThreeWayDiff).mockResolvedValue(mockResult);

    await command.run({ values: {} } as never);

    expect(printThreeWayDiffResult).toHaveBeenCalledWith(
      mockResult,
      expect.any(Function),
    );
  });

  it("エラー発生時にhandleCliErrorで処理される", async () => {
    const error = new Error("API connection failed");
    vi.mocked(detectThreeWayDiff).mockRejectedValue(error);

    await command.run({ values: {} } as never);

    expect(handleCliError).toHaveBeenCalledWith(error);
    expect(printThreeWayDiffResult).not.toHaveBeenCalled();
  });
});
