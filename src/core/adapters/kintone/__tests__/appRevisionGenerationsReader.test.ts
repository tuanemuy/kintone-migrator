import {
  type KintoneRestAPIClient,
  KintoneRestAPIError,
} from "@kintone/rest-api-client";
import { describe, expect, it, vi } from "vitest";
import {
  ForbiddenError,
  NotFoundError,
  SystemError,
  SystemErrorCode,
  UnauthenticatedError,
} from "@/core/application/error";
import { KintoneAppRevisionGenerationsReader } from "../appRevisionGenerationsReader";

function createKintoneAPIError(
  status: number,
  code: string,
): KintoneRestAPIError {
  return new KintoneRestAPIError({
    status,
    statusText: "Error",
    data: { id: "test-id", code, message: "test error" },
    headers: {},
  });
}

type AclResponse = { revision?: string } | Error;

// `getAppAcl` answers in call order. Only `getAppAcl` exists on the mock, so
// calling any other client method fails the test.
function createMockClient(responses: readonly AclResponse[]) {
  const queue = [...responses];
  const getAppAcl = vi.fn(
    async (_params: { app: string; preview: boolean }) => {
      const next = queue.shift();
      if (next === undefined) {
        throw new Error("unexpected getAppAcl call");
      }
      if (next instanceof Error) {
        throw next;
      }
      return { rights: [], ...next };
    },
  );
  const client = { app: { getAppAcl } } as unknown as KintoneRestAPIClient;
  return { client, getAppAcl };
}

describe("KintoneAppRevisionGenerationsReader", () => {
  it("getAppAcl を preview → published の順に 1 回ずつ呼び、両世代の revision を返す", async () => {
    const { client, getAppAcl } = createMockClient([
      { revision: "8" },
      { revision: "7" },
    ]);
    const reader = new KintoneAppRevisionGenerationsReader(client, "42");

    const generations = await reader.read();

    expect(generations).toEqual({
      preview: "8",
      published: { kind: "deployed", revision: "7" },
    });
    expect(getAppAcl.mock.calls).toEqual([
      [{ app: "42", preview: true }],
      [{ app: "42", preview: false }],
    ]);
  });

  it("published が GAIA_AP01 なら preview を読み直し、成功すれば neverDeployed を返す", async () => {
    const { client, getAppAcl } = createMockClient([
      { revision: "2" },
      createKintoneAPIError(404, "GAIA_AP01"),
      { revision: "2" },
    ]);
    const reader = new KintoneAppRevisionGenerationsReader(client, "42");

    const generations = await reader.read();

    expect(generations).toEqual({
      preview: "2",
      published: { kind: "neverDeployed" },
    });
    expect(getAppAcl.mock.calls).toEqual([
      [{ app: "42", preview: true }],
      [{ app: "42", preview: false }],
      [{ app: "42", preview: true }],
    ]);
  });

  it("published が GAIA_AP01 の後に preview の読み直しが失敗したら neverDeployed にせずそのエラーを投げる", async () => {
    const { client } = createMockClient([
      { revision: "2" },
      createKintoneAPIError(404, "GAIA_AP01"),
      createKintoneAPIError(404, "GAIA_AP01"),
    ]);
    const reader = new KintoneAppRevisionGenerationsReader(client, "42");

    const result = reader.read();

    await expect(result).rejects.toThrow(NotFoundError);
    await expect(result).rejects.toThrow(
      "Failed to get the preview app revision",
    );
  });

  it("preview の読み取りが失敗したら published を読まずにエラーを投げる（存在しないアプリ）", async () => {
    const { client, getAppAcl } = createMockClient([
      createKintoneAPIError(404, "GAIA_AP01"),
    ]);
    const reader = new KintoneAppRevisionGenerationsReader(client, "42");

    const result = reader.read();

    await expect(result).rejects.toThrow(NotFoundError);
    await expect(result).rejects.toThrow(
      "Failed to get the preview app revision",
    );
    expect(getAppAcl).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["403", createKintoneAPIError(403, "GAIA_NO01"), ForbiddenError],
    ["401", createKintoneAPIError(401, "CB_WA01"), UnauthenticatedError],
    ["500", createKintoneAPIError(500, "GAIA_IL23"), SystemError],
    [
      "GAIA_AP01 以外の 404",
      createKintoneAPIError(404, "GAIA_RE01"),
      NotFoundError,
    ],
  ])("published の読み取りが %s で失敗したら neverDeployed にせず published 向けのメッセージでエラーを投げる", async (_label, error, errorClass) => {
    const { client, getAppAcl } = createMockClient([{ revision: "2" }, error]);
    const reader = new KintoneAppRevisionGenerationsReader(client, "42");

    const result = reader.read();

    await expect(result).rejects.toThrow(errorClass);
    await expect(result).rejects.toThrow(
      "Failed to get the published app revision",
    );
    expect(getAppAcl).toHaveBeenCalledTimes(2);
  });

  it("preview の応答に revision が無ければ SystemError を投げる", async () => {
    const { client } = createMockClient([{}]);
    const reader = new KintoneAppRevisionGenerationsReader(client, "42");

    await expect(reader.read()).rejects.toThrow(
      new SystemError(
        SystemErrorCode.ExternalApiError,
        "kintone API did not return an app revision",
      ),
    );
  });

  it("published の応答に revision が無ければ neverDeployed にせず SystemError を投げる", async () => {
    const { client } = createMockClient([{ revision: "2" }, {}]);
    const reader = new KintoneAppRevisionGenerationsReader(client, "42");

    await expect(reader.read()).rejects.toThrow(
      "kintone API did not return an app revision",
    );
  });
});
