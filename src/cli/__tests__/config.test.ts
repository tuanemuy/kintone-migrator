import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveConfig } from "../config";

describe("resolveConfig", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("ユーザー名/パスワードが揃っている場合、パスワード認証の設定を返す", () => {
    vi.stubEnv("KINTONE_DOMAIN", "example.cybozu.com");
    vi.stubEnv("KINTONE_USERNAME", "user");
    vi.stubEnv("KINTONE_PASSWORD", "pass");
    vi.stubEnv("KINTONE_APP_ID", "42");

    const config = resolveConfig({});
    expect(config).toEqual({
      baseUrl: "https://example.cybozu.com",
      auth: { type: "password", username: "user", password: "pass" },
      appId: "42",
      schemaFilePath: "schema.yaml",
    });
  });

  it("API Tokenが設定されている場合、API Token認証の設定を返す", () => {
    vi.stubEnv("KINTONE_DOMAIN", "example.cybozu.com");
    vi.stubEnv("KINTONE_API_TOKEN", "my-token");
    vi.stubEnv("KINTONE_APP_ID", "42");

    const config = resolveConfig({});
    expect(config).toEqual({
      baseUrl: "https://example.cybozu.com",
      auth: { type: "apiToken", apiToken: "my-token" },
      appId: "42",
      schemaFilePath: "schema.yaml",
    });
  });

  it("カンマ区切りの複数API Tokenを配列として返す", () => {
    vi.stubEnv("KINTONE_DOMAIN", "example.cybozu.com");
    vi.stubEnv("KINTONE_API_TOKEN", "token1, token2, token3");
    vi.stubEnv("KINTONE_APP_ID", "42");

    const config = resolveConfig({});
    expect(config.auth).toEqual({
      type: "apiToken",
      apiToken: ["token1", "token2", "token3"],
    });
  });

  it("API Tokenとユーザー名/パスワードの両方がある場合、API Tokenが優先される", () => {
    vi.stubEnv("KINTONE_DOMAIN", "example.cybozu.com");
    vi.stubEnv("KINTONE_API_TOKEN", "my-token");
    vi.stubEnv("KINTONE_USERNAME", "user");
    vi.stubEnv("KINTONE_PASSWORD", "pass");
    vi.stubEnv("KINTONE_APP_ID", "42");

    const config = resolveConfig({});
    expect(config.auth).toEqual({
      type: "apiToken",
      apiToken: "my-token",
    });
  });

  it("認証情報が両方未設定の場合、エラーをスローする", () => {
    vi.stubEnv("KINTONE_DOMAIN", "example.cybozu.com");
    vi.stubEnv("KINTONE_APP_ID", "42");

    expect(() => resolveConfig({})).toThrow(
      "Either KINTONE_API_TOKEN or KINTONE_USERNAME/KINTONE_PASSWORD is required",
    );
  });

  it("CLI引数の--api-tokenが環境変数より優先される", () => {
    vi.stubEnv("KINTONE_DOMAIN", "example.cybozu.com");
    vi.stubEnv("KINTONE_API_TOKEN", "env-token");
    vi.stubEnv("KINTONE_APP_ID", "42");

    const config = resolveConfig({ "api-token": "cli-token" });
    expect(config.auth).toEqual({
      type: "apiToken",
      apiToken: "cli-token",
    });
  });

  it("KINTONE_APP_IDが未設定の場合、エラーをスローする", () => {
    vi.stubEnv("KINTONE_DOMAIN", "example.cybozu.com");
    vi.stubEnv("KINTONE_USERNAME", "user");
    vi.stubEnv("KINTONE_PASSWORD", "pass");

    expect(() => resolveConfig({})).toThrow("KINTONE_APP_ID is required");
  });

  it("SCHEMA_FILE_PATHが未設定の場合、デフォルトでschema.yamlを使用する", () => {
    vi.stubEnv("KINTONE_DOMAIN", "example.cybozu.com");
    vi.stubEnv("KINTONE_USERNAME", "user");
    vi.stubEnv("KINTONE_PASSWORD", "pass");
    vi.stubEnv("KINTONE_APP_ID", "1");

    const config = resolveConfig({});
    expect(config.schemaFilePath).toBe("schema.yaml");
  });

  it("SCHEMA_FILE_PATHが設定されている場合、その値を使用する", () => {
    vi.stubEnv("KINTONE_DOMAIN", "example.cybozu.com");
    vi.stubEnv("KINTONE_USERNAME", "user");
    vi.stubEnv("KINTONE_PASSWORD", "pass");
    vi.stubEnv("KINTONE_APP_ID", "1");
    vi.stubEnv("SCHEMA_FILE_PATH", "custom/path/schema.yaml");

    const config = resolveConfig({});
    expect(config.schemaFilePath).toBe("custom/path/schema.yaml");
  });

  it("CLI引数が環境変数より優先される", () => {
    vi.stubEnv("KINTONE_DOMAIN", "env.cybozu.com");
    vi.stubEnv("KINTONE_USERNAME", "env-user");
    vi.stubEnv("KINTONE_PASSWORD", "env-pass");
    vi.stubEnv("KINTONE_APP_ID", "1");

    const config = resolveConfig({
      domain: "cli.cybozu.com",
      username: "cli-user",
      password: "cli-pass",
      "app-id": "99",
      "schema-file": "custom.yaml",
    });

    expect(config).toEqual({
      baseUrl: "https://cli.cybozu.com",
      auth: { type: "password", username: "cli-user", password: "cli-pass" },
      appId: "99",
      schemaFilePath: "custom.yaml",
    });
  });
});
