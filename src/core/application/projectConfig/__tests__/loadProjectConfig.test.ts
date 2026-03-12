import { describe, expect, it } from "vitest";
import { configCodec } from "@/core/adapters/yaml/configCodec";
import { isValidationError } from "../../error";
import { loadProjectConfig } from "../loadProjectConfig";

describe("loadProjectConfig", () => {
  it("有効なYAMLを正常にパースする", () => {
    const content = `
domain: https://example.cybozu.com
auth:
  username: user1
  password: pass1
apps:
  app1:
    appId: "100"
    schemaFilePath: schema.yaml
`;
    const config = loadProjectConfig({ content }, configCodec);

    expect(config.apps.size).toBe(1);
  });

  it("無効な構文の場合、ValidationErrorをスローする", () => {
    const content = "{ invalid yaml:";
    try {
      loadProjectConfig({ content }, configCodec);
      expect.fail("Expected ValidationError to be thrown");
    } catch (error) {
      expect(isValidationError(error)).toBe(true);
      if (isValidationError(error)) {
        expect(error.message).toContain("Failed to parse Project config:");
      }
    }
  });

  it("複数アプリの設定をパースする", () => {
    const content = `
domain: https://example.cybozu.com
auth:
  username: user1
  password: pass1
apps:
  app1:
    appId: "100"
    schemaFilePath: schema1.yaml
  app2:
    appId: "200"
    schemaFilePath: schema2.yaml
`;
    const config = loadProjectConfig({ content }, configCodec);

    expect(config.apps.size).toBe(2);
  });

  it("依存関係を含む設定をパースする", () => {
    const content = `
domain: https://example.cybozu.com
auth:
  username: user1
  password: pass1
apps:
  app1:
    appId: "100"
    schemaFilePath: schema1.yaml
  app2:
    appId: "200"
    schemaFilePath: schema2.yaml
    dependsOn:
      - app1
`;
    const config = loadProjectConfig({ content }, configCodec);

    expect(config.apps.size).toBe(2);
  });
});
