import { afterEach, describe, expect, it, vi } from "vitest";
import type { DetectDiffOutput } from "@/core/application/formSchema/dto";
import type { FieldCode } from "@/core/domain/formSchema/valueObject";

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

vi.mock("@/core/application/formSchema/detectDiff");

vi.mock("@/cli/output", () => ({
  printDiffResult: vi.fn(),
  printAppHeader: vi.fn(),
  printMultiAppResult: vi.fn(),
  promptDeploy: vi.fn(),
}));

vi.mock("@/cli/handleError", () => ({
  handleCliError: vi.fn(),
}));

import { handleCliError } from "@/cli/handleError";
import { printDiffResult } from "@/cli/output";
import { detectDiff } from "@/core/application/formSchema/detectDiff";
import command from "../diff";

afterEach(() => {
  vi.clearAllMocks();
});

function emptyDiffResult(): DetectDiffOutput {
  return {
    entries: [],
    schemaFields: [],
    summary: { added: 0, modified: 0, deleted: 0, total: 0 },
    isEmpty: true,
    hasLayoutChanges: false,
  };
}

describe("diff コマンド", () => {
  it("スキーマとフォームの差分を検出し結果を表示する", async () => {
    const mockResult = emptyDiffResult();
    vi.mocked(detectDiff).mockResolvedValue(mockResult);

    await command.run({ values: {} } as never);

    expect(detectDiff).toHaveBeenCalled();
    expect(printDiffResult).toHaveBeenCalledWith(mockResult);
  });

  it("差分がある場合もprintDiffResultに結果が渡される", async () => {
    const mockResult: DetectDiffOutput = {
      entries: [
        {
          type: "added",
          fieldCode: "name" as FieldCode,
          fieldLabel: "名前",
          details: "新規追加",
          after: {
            code: "name" as FieldCode,
            type: "SINGLE_LINE_TEXT",
            label: "名前",
            properties: {},
          },
        },
      ],
      schemaFields: [
        {
          fieldCode: "name" as FieldCode,
          fieldLabel: "名前",
          fieldType: "SINGLE_LINE_TEXT",
        },
      ],
      summary: { added: 1, modified: 0, deleted: 0, total: 1 },
      isEmpty: false,
      hasLayoutChanges: false,
    };
    vi.mocked(detectDiff).mockResolvedValue(mockResult);

    await command.run({ values: {} } as never);

    expect(printDiffResult).toHaveBeenCalledWith(mockResult);
  });

  it("エラー発生時にhandleCliErrorで処理される", async () => {
    const error = new Error("API connection failed");
    vi.mocked(detectDiff).mockRejectedValue(error);

    await command.run({ values: {} } as never);

    expect(handleCliError).toHaveBeenCalledWith(error);
    expect(printDiffResult).not.toHaveBeenCalled();
  });
});
