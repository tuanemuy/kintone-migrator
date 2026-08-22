import type { KintoneRestAPIClient } from "@kintone/rest-api-client";
import { KintoneRestAPIError } from "@kintone/rest-api-client";
import { describe, expect, it, vi } from "vitest";
import { KintoneFormDumpReader } from "../formDumpReader";

function createMockClient(
  overrides: {
    getFormFields?: (params: unknown) => Promise<unknown>;
    getFormLayout?: (params: unknown) => Promise<unknown>;
  } = {},
) {
  return {
    app: {
      getFormFields: vi.fn(
        overrides.getFormFields ??
          (() => Promise.resolve({ properties: {}, revision: "1" })),
      ),
      getFormLayout: vi.fn(
        overrides.getFormLayout ??
          (() => Promise.resolve({ layout: [], revision: "1" })),
      ),
    },
  } as unknown as KintoneRestAPIClient;
}

function notFoundError(): KintoneRestAPIError {
  return new KintoneRestAPIError({
    data: {
      id: "test",
      code: "GAIA_AP01",
      message: "指定したアプリが見つかりません。",
    },
    status: 404,
    statusText: "Not Found",
    headers: {},
  });
}

describe("KintoneFormDumpReader", () => {
  const APP_ID = "1";

  it("引数省略時は fields / layout の両方を preview: true で取得する", async () => {
    const client = createMockClient();
    const reader = new KintoneFormDumpReader(client, APP_ID);

    await reader.getRawFormData();

    expect(client.app.getFormFields).toHaveBeenCalledWith({
      app: APP_ID,
      preview: true,
    });
    expect(client.app.getFormLayout).toHaveBeenCalledWith({
      app: APP_ID,
      preview: true,
    });
  });

  it('"published" 指定時は fields / layout の両方を preview: false で取得する', async () => {
    const client = createMockClient();
    const reader = new KintoneFormDumpReader(client, APP_ID);

    await reader.getRawFormData("published");

    expect(client.app.getFormFields).toHaveBeenCalledWith({
      app: APP_ID,
      preview: false,
    });
    expect(client.app.getFormLayout).toHaveBeenCalledWith({
      app: APP_ID,
      preview: false,
    });
  });

  it("生レスポンスをそのまま返す（revision も含む）", async () => {
    const fields = { properties: { name: { type: "SINGLE_LINE_TEXT" } } };
    const layout = { layout: [{ type: "ROW" }], revision: "3" };
    const client = createMockClient({
      getFormFields: () => Promise.resolve({ ...fields, revision: "3" }),
      getFormLayout: () => Promise.resolve(layout),
    });
    const reader = new KintoneFormDumpReader(client, APP_ID);

    const result = await reader.getRawFormData();

    expect(result.fields).toEqual({ ...fields, revision: "3" });
    expect(result.layout).toEqual(layout);
  });

  it("published 読み取りの失敗は published 向けメッセージでラップされる", async () => {
    const client = createMockClient({
      getFormFields: () => Promise.reject(notFoundError()),
    });
    const reader = new KintoneFormDumpReader(client, APP_ID);

    await expect(reader.getRawFormData("published")).rejects.toThrow(
      /^Failed to fetch published raw form data for dump \(the app may not be deployed yet, or the credentials may not be allowed to read it\): /,
    );
  });

  it("published 読み取りの失敗は 403 でも同じメッセージになる（ステータスで出し分けない）", async () => {
    const client = createMockClient({
      getFormLayout: () =>
        Promise.reject(
          new KintoneRestAPIError({
            data: {
              id: "test",
              code: "CB_NO02",
              message: "権限がありません。",
            },
            status: 403,
            statusText: "Forbidden",
            headers: {},
          }),
        ),
    });
    const reader = new KintoneFormDumpReader(client, APP_ID);

    await expect(reader.getRawFormData("published")).rejects.toThrow(
      /^Failed to fetch published raw form data for dump \(the app may not be deployed yet, or the credentials may not be allowed to read it\): /,
    );
  });

  it("published 読み取りの失敗は fields 側が 403 でも同じメッセージになる（ステータスで出し分けない）", async () => {
    const client = createMockClient({
      getFormFields: () =>
        Promise.reject(
          new KintoneRestAPIError({
            data: {
              id: "test",
              code: "CB_NO02",
              message: "権限がありません。",
            },
            status: 403,
            statusText: "Forbidden",
            headers: {},
          }),
        ),
    });
    const reader = new KintoneFormDumpReader(client, APP_ID);

    await expect(reader.getRawFormData("published")).rejects.toThrow(
      /^Failed to fetch published raw form data for dump \(the app may not be deployed yet, or the credentials may not be allowed to read it\): /,
    );
  });

  it("published 読み取りの失敗は fields 側が 401 でも同じメッセージになる", async () => {
    const client = createMockClient({
      getFormFields: () =>
        Promise.reject(
          new KintoneRestAPIError({
            data: {
              id: "test",
              code: "CB_AU01",
              message: "認証に失敗しました。",
            },
            status: 401,
            statusText: "Unauthorized",
            headers: {},
          }),
        ),
    });
    const reader = new KintoneFormDumpReader(client, APP_ID);

    await expect(reader.getRawFormData("published")).rejects.toThrow(
      /^Failed to fetch published raw form data for dump \(the app may not be deployed yet, or the credentials may not be allowed to read it\): /,
    );
  });

  it("published 読み取りの失敗は layout 側が 404 でも同じメッセージになる", async () => {
    const client = createMockClient({
      getFormLayout: () => Promise.reject(notFoundError()),
    });
    const reader = new KintoneFormDumpReader(client, APP_ID);

    await expect(reader.getRawFormData("published")).rejects.toThrow(
      /^Failed to fetch published raw form data for dump \(the app may not be deployed yet, or the credentials may not be allowed to read it\): /,
    );
  });

  it("published 読み取りの失敗は layout 側が 401 でも同じメッセージになる", async () => {
    const client = createMockClient({
      getFormLayout: () =>
        Promise.reject(
          new KintoneRestAPIError({
            data: {
              id: "test",
              code: "CB_AU01",
              message: "認証に失敗しました。",
            },
            status: 401,
            statusText: "Unauthorized",
            headers: {},
          }),
        ),
    });
    const reader = new KintoneFormDumpReader(client, APP_ID);

    await expect(reader.getRawFormData("published")).rejects.toThrow(
      /^Failed to fetch published raw form data for dump \(the app may not be deployed yet, or the credentials may not be allowed to read it\): /,
    );
  });

  it("preview 読み取りの失敗メッセージは従来のまま", async () => {
    const client = createMockClient({
      getFormFields: () => Promise.reject(notFoundError()),
    });
    const reader = new KintoneFormDumpReader(client, APP_ID);

    await expect(reader.getRawFormData()).rejects.toThrow(
      /^Failed to fetch raw form data for dump: /,
    );
  });
});
