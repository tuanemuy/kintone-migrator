import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getFormFields: vi.fn(),
  getFormLayout: vi.fn(),
  writeFile: vi.fn(),
  mkdir: vi.fn(),
  spinnerStart: vi.fn(),
  spinnerStop: vi.fn(),
}));

vi.mock("@clack/prompts", () => ({
  spinner: vi.fn(() => ({
    start: mocks.spinnerStart,
    stop: mocks.spinnerStop,
  })),
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

vi.mock("@kintone/rest-api-client", async (importOriginal) => {
  const { KintoneRestAPIError } =
    await importOriginal<typeof import("@kintone/rest-api-client")>();
  return {
    KintoneRestAPIError,
    KintoneRestAPIClient: class {
      app = {
        getFormFields: mocks.getFormFields,
        getFormLayout: mocks.getFormLayout,
      };
    },
  };
});

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

import { resolve } from "node:path";
import * as p from "@clack/prompts";
import { handleCliError } from "@/cli/handleError";
import { resolveAppCliConfig, routeMultiApp } from "@/cli/projectConfig";
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

    expect(mocks.getFormFields).toHaveBeenCalledWith(
      expect.objectContaining({ preview: true }),
    );
    expect(mocks.getFormLayout).toHaveBeenCalledWith(
      expect.objectContaining({ preview: true }),
    );
    expect(mocks.writeFile).toHaveBeenCalledWith(
      resolve(process.cwd(), "fields.json"),
      JSON.stringify(fieldsData, null, 2),
      "utf-8",
    );
    expect(mocks.writeFile).toHaveBeenCalledWith(
      resolve(process.cwd(), "layout.json"),
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

  it("--published なしのスピナー文言と成功メッセージは従来と同一である", async () => {
    mocks.getFormFields.mockResolvedValue({});
    mocks.getFormLayout.mockResolvedValue({});
    mocks.writeFile.mockResolvedValue(undefined);

    await command.run({ values: {} } as never);

    expect(mocks.spinnerStart).toHaveBeenCalledWith(
      "Fetching form fields and layout...",
    );
    expect(mocks.spinnerStop).toHaveBeenCalledWith("Form data fetched.");
    expect(p.log.success).toHaveBeenCalledWith(
      expect.stringContaining("Saved "),
    );
    expect(p.log.success).not.toHaveBeenCalledWith(
      expect.stringContaining("published-"),
    );
  });

  describe("--published", () => {
    it("preview: false で API を呼び published- 前置のファイルに書き出す", async () => {
      const fieldsData = { properties: {}, revision: "9" };
      const layoutData = { layout: [], revision: "9" };
      mocks.getFormFields.mockResolvedValue(fieldsData);
      mocks.getFormLayout.mockResolvedValue(layoutData);
      mocks.writeFile.mockResolvedValue(undefined);

      await command.run({ values: { published: true } } as never);

      expect(mocks.getFormFields).toHaveBeenCalledWith(
        expect.objectContaining({ preview: false }),
      );
      expect(mocks.getFormLayout).toHaveBeenCalledWith(
        expect.objectContaining({ preview: false }),
      );
      expect(mocks.writeFile).toHaveBeenCalledWith(
        resolve(process.cwd(), "published-fields.json"),
        JSON.stringify(fieldsData, null, 2),
        "utf-8",
      );
      expect(mocks.writeFile).toHaveBeenCalledWith(
        resolve(process.cwd(), "published-layout.json"),
        JSON.stringify(layoutData, null, 2),
        "utf-8",
      );
    });

    it("published 時のスピナー開始文言が差し替わり、成功メッセージが published- 前置のファイル名を示す", async () => {
      mocks.getFormFields.mockResolvedValue({});
      mocks.getFormLayout.mockResolvedValue({});
      mocks.writeFile.mockResolvedValue(undefined);

      await command.run({ values: { published: true } } as never);

      expect(mocks.spinnerStart).toHaveBeenCalledWith(
        "Fetching published form fields and layout...",
      );
      expect(mocks.spinnerStop).toHaveBeenCalledWith("Form data fetched.");
      expect(p.log.success).toHaveBeenCalledWith(
        expect.stringContaining("published-fields.json"),
      );
      expect(p.log.success).toHaveBeenCalledWith(
        expect.stringContaining("published-layout.json"),
      );
    });

    it("--app 相当のベース prefix と組み合わせると <name>-published-*.json になる", async () => {
      mocks.getFormFields.mockResolvedValue({});
      mocks.getFormLayout.mockResolvedValue({});
      mocks.writeFile.mockResolvedValue(undefined);
      vi.mocked(resolveAppCliConfig).mockReturnValue({
        baseUrl: "https://test.cybozu.com",
        auth: { type: "password", username: "user", password: "pass" },
        appId: "1",
      } as never);
      vi.mocked(routeMultiApp).mockImplementationOnce((async (
        _values: unknown,
        handlers: {
          singleApp: (app: unknown, projectConfig: unknown) => Promise<void>;
        },
      ) => {
        await handlers.singleApp({ name: "orders", appId: "1" }, {});
      }) as never);

      await command.run({
        values: { published: true, app: "orders" },
      } as never);

      expect(mocks.writeFile).toHaveBeenCalledWith(
        resolve(process.cwd(), "orders-published-fields.json"),
        expect.any(String),
        "utf-8",
      );
      expect(mocks.writeFile).toHaveBeenCalledWith(
        resolve(process.cwd(), "orders-published-layout.json"),
        expect.any(String),
        "utf-8",
      );
    });
  });
});
