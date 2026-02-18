import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getFormFields: vi.fn(),
  getFormLayout: vi.fn(),
  writeFile: vi.fn(),
  mkdir: vi.fn(),
}));

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

vi.mock("@/cli/config", () => ({
  kintoneArgs: {},
  multiAppArgs: {},
  resolveConfig: vi.fn(() => ({
    baseUrl: "https://test.cybozu.com",
    auth: { type: "password", username: "user", password: "pass" },
    appId: "1",
    schemaFilePath: "schema.yaml",
  })),
  buildKintoneAuth: vi.fn(() => ({ username: "user", password: "pass" })),
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

vi.mock("@kintone/rest-api-client", () => ({
  KintoneRestAPIClient: class {
    app = {
      getFormFields: mocks.getFormFields,
      getFormLayout: mocks.getFormLayout,
    };
  },
}));

vi.mock("node:fs/promises", () => ({
  writeFile: mocks.writeFile,
  mkdir: mocks.mkdir,
}));

vi.mock("@/cli/output", () => ({
  printAppHeader: vi.fn(),
  printMultiAppResult: vi.fn(),
}));

vi.mock("@/cli/handleError", () => ({
  handleCliError: vi.fn(),
}));

import * as p from "@clack/prompts";
import { handleCliError } from "@/cli/handleError";
import { SystemError } from "@/core/application/error";
import command from "../dump";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.mkdir.mockResolvedValue(undefined);
});

describe("dump コマンド", () => {
  it("kintoneのフォームフィールドとレイアウトをJSONファイルに出力する", async () => {
    const fieldsData = { properties: { name: { type: "SINGLE_LINE_TEXT" } } };
    const layoutData = { layout: [{ type: "ROW" }] };
    mocks.getFormFields.mockResolvedValue(fieldsData);
    mocks.getFormLayout.mockResolvedValue(layoutData);
    mocks.writeFile.mockResolvedValue(undefined);

    await command.run({ values: {} } as never);

    expect(mocks.getFormFields).toHaveBeenCalled();
    expect(mocks.getFormLayout).toHaveBeenCalled();
    expect(mocks.writeFile).toHaveBeenCalledWith(
      "fields.json",
      JSON.stringify(fieldsData, null, 2),
      "utf-8",
    );
    expect(mocks.writeFile).toHaveBeenCalledWith(
      "layout.json",
      JSON.stringify(layoutData, null, 2),
      "utf-8",
    );
  });

  it("保存成功時にファイル名を含む成功メッセージが表示される", async () => {
    mocks.getFormFields.mockResolvedValue({});
    mocks.getFormLayout.mockResolvedValue({});
    mocks.writeFile.mockResolvedValue(undefined);

    await command.run({ values: {} } as never);

    expect(p.log.success).toHaveBeenCalledWith(
      expect.stringContaining("fields.json"),
    );
    expect(p.log.success).toHaveBeenCalledWith(
      expect.stringContaining("layout.json"),
    );
  });

  it("kintone APIエラー時にhandleCliErrorで処理される", async () => {
    const error = new Error("API error");
    mocks.getFormFields.mockRejectedValue(error);
    mocks.getFormLayout.mockResolvedValue({});

    await command.run({ values: {} } as never);

    expect(handleCliError).toHaveBeenCalledWith(expect.any(SystemError));
  });

  it("ファイル書き込みエラー時にhandleCliErrorで処理される", async () => {
    mocks.getFormFields.mockResolvedValue({});
    mocks.getFormLayout.mockResolvedValue({});
    const error = new Error("Write error");
    mocks.writeFile.mockRejectedValue(error);

    await command.run({ values: {} } as never);

    expect(handleCliError).toHaveBeenCalledWith(expect.any(SystemError));
  });
});
