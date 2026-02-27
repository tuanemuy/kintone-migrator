import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@clack/prompts", () => ({
  spinner: vi.fn(() => ({ start: vi.fn(), stop: vi.fn() })),
  log: {
    info: vi.fn(),
    success: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
  note: vi.fn(),
  outro: vi.fn(),
}));

vi.mock("@/cli/config", () => ({
  multiAppArgs: {},
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

vi.mock("@/core/adapters/local/schemaStorage", () => ({
  createLocalFileSchemaStorage: vi.fn(),
}));

vi.mock("@/core/application/formSchema/validateSchema");

vi.mock("@/cli/handleError", () => ({
  handleCliError: vi.fn(),
}));

vi.mock("@/cli/output", () => ({
  printAppHeader: vi.fn(),
}));

import * as p from "@clack/prompts";
import { handleCliError } from "@/cli/handleError";
import { validateSchema } from "@/core/application/formSchema/validateSchema";
import command from "../validate";

afterEach(() => {
  vi.clearAllMocks();
});

describe("validate コマンド", () => {
  it("有効なスキーマの場合に成功メッセージを表示する", async () => {
    vi.mocked(validateSchema).mockResolvedValue({
      validationResult: { issues: [], isValid: true },
      fieldCount: 3,
    });

    await command.run({ values: {} } as never);

    expect(p.log.success).toHaveBeenCalledWith(
      expect.stringContaining("Valid"),
    );
    expect(p.outro).toHaveBeenCalledWith("Validation passed.");
  });

  it("パースエラーがある場合にエラーメッセージを表示する", async () => {
    vi.mocked(validateSchema).mockResolvedValue({
      parseError: "Invalid YAML syntax",
      fieldCount: 0,
    });

    await command.run({ values: {} } as never);

    expect(p.log.error).toHaveBeenCalledWith(
      expect.stringContaining("Parse error"),
    );
  });

  it("バリデーションエラーがある場合にエラーサマリーを表示する", async () => {
    vi.mocked(validateSchema).mockResolvedValue({
      validationResult: {
        issues: [
          {
            severity: "error",
            fieldCode: "name",
            fieldType: "SINGLE_LINE_TEXT",
            rule: "EMPTY_LABEL",
            message: "Field must have a non-empty label",
          },
        ],
        isValid: false,
      },
      fieldCount: 1,
    });

    await command.run({ values: {} } as never);

    expect(p.note).toHaveBeenCalled();
    expect(p.log.error).toHaveBeenCalledWith(expect.stringContaining("error"));
  });

  it("警告のみの場合に警告メッセージを表示する", async () => {
    vi.mocked(validateSchema).mockResolvedValue({
      validationResult: {
        issues: [
          {
            severity: "warning",
            fieldCode: "url",
            fieldType: "LINK",
            rule: "MISSING_PROTOCOL",
            message: "Should have a protocol",
          },
        ],
        isValid: true,
      },
      fieldCount: 1,
    });

    await command.run({ values: {} } as never);

    expect(p.note).toHaveBeenCalled();
    expect(p.log.warn).toHaveBeenCalled();
  });

  it("エラー発生時にhandleCliErrorで処理される", async () => {
    const error = new Error("Unexpected error");
    vi.mocked(validateSchema).mockRejectedValue(error);

    await command.run({ values: {} } as never);

    expect(handleCliError).toHaveBeenCalledWith(error);
  });
});
