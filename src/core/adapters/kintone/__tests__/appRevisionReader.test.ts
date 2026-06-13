import type { KintoneRestAPIClient } from "@kintone/rest-api-client";
import { describe, expect, it, vi } from "vitest";
import { SystemError } from "@/core/application/error";
import { KintoneAppRevisionReader } from "../appRevisionReader";

function createMockClient(
  getFormFields: (params: unknown) => Promise<unknown>,
) {
  return {
    app: {
      getFormFields: vi.fn(getFormFields),
    },
  } as unknown as KintoneRestAPIClient;
}

describe("KintoneAppRevisionReader", () => {
  it("getFormFields({ preview: true }) を 1 回呼び revision のみを返す", async () => {
    const getFormFields = vi.fn(() =>
      Promise.resolve({ properties: {}, revision: "42" }),
    );
    const client = createMockClient(getFormFields);
    const reader = new KintoneAppRevisionReader(client, "1");

    const revision = await reader.getCurrent();

    expect(revision).toBe("42");
    expect(getFormFields).toHaveBeenCalledTimes(1);
    expect(getFormFields).toHaveBeenCalledWith({ app: "1", preview: true });
  });

  it("revision が返らない場合は SystemError をスローする", async () => {
    const client = createMockClient(() => Promise.resolve({ properties: {} }));
    const reader = new KintoneAppRevisionReader(client, "1");

    await expect(reader.getCurrent()).rejects.toThrow(SystemError);
  });
});
