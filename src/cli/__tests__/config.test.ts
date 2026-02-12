import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resolveConfig } from "../config";

describe("resolveConfig", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("必須環境変数がすべて揃っている場合、設定を返す", () => {
    process.env.KINTONE_DOMAIN = "example.cybozu.com";
    process.env.KINTONE_USERNAME = "user";
    process.env.KINTONE_PASSWORD = "pass";
    process.env.KINTONE_APP_ID = "42";

    const config = resolveConfig({});
    expect(config).toEqual({
      baseUrl: "https://example.cybozu.com",
      username: "user",
      password: "pass",
      appId: "42",
      schemaFilePath: "schema.yaml",
    });
  });

  it("KINTONE_APP_IDが未設定の場合、エラーをスローする", () => {
    process.env.KINTONE_DOMAIN = "example.cybozu.com";
    process.env.KINTONE_USERNAME = "user";
    process.env.KINTONE_PASSWORD = "pass";
    delete process.env.KINTONE_APP_ID;

    expect(() => resolveConfig({})).toThrow("KINTONE_APP_ID is required");
  });

  it("SCHEMA_FILE_PATHが未設定の場合、デフォルトでschema.yamlを使用する", () => {
    process.env.KINTONE_DOMAIN = "example.cybozu.com";
    process.env.KINTONE_USERNAME = "user";
    process.env.KINTONE_PASSWORD = "pass";
    process.env.KINTONE_APP_ID = "1";
    delete process.env.SCHEMA_FILE_PATH;

    const config = resolveConfig({});
    expect(config.schemaFilePath).toBe("schema.yaml");
  });

  it("SCHEMA_FILE_PATHが設定されている場合、その値を使用する", () => {
    process.env.KINTONE_DOMAIN = "example.cybozu.com";
    process.env.KINTONE_USERNAME = "user";
    process.env.KINTONE_PASSWORD = "pass";
    process.env.KINTONE_APP_ID = "1";
    process.env.SCHEMA_FILE_PATH = "custom/path/schema.yaml";

    const config = resolveConfig({});
    expect(config.schemaFilePath).toBe("custom/path/schema.yaml");
  });

  it("CLI引数が環境変数より優先される", () => {
    process.env.KINTONE_DOMAIN = "env.cybozu.com";
    process.env.KINTONE_USERNAME = "env-user";
    process.env.KINTONE_PASSWORD = "env-pass";
    process.env.KINTONE_APP_ID = "1";

    const config = resolveConfig({
      domain: "cli.cybozu.com",
      username: "cli-user",
      password: "cli-pass",
      "app-id": "99",
      "schema-file": "custom.yaml",
    });

    expect(config).toEqual({
      baseUrl: "https://cli.cybozu.com",
      username: "cli-user",
      password: "cli-pass",
      appId: "99",
      schemaFilePath: "custom.yaml",
    });
  });
});
