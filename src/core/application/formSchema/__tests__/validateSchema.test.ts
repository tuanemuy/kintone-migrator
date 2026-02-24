import { describe, expect, it } from "vitest";
import { ValidationError } from "@/core/application/error";
import { setupTestFormSchemaContainer } from "../../__tests__/helpers";
import { validateSchema } from "../validateSchema";

const getContainer = setupTestFormSchemaContainer();

describe("validateSchema", () => {
  it("正常なスキーマファイルの場合、validationResult を返す", async () => {
    const container = getContainer();
    const yaml = `
layout:
  - type: ROW
    fields:
      - code: name
        type: SINGLE_LINE_TEXT
        label: 名前
`;
    container.schemaStorage.setContent(yaml);
    const result = await validateSchema({ container });
    expect(result.parseError).toBeUndefined();
    expect(result.validationResult).toBeDefined();
    expect(result.validationResult?.isValid).toBe(true);
    expect(result.fieldCount).toBe(1);
  });

  it("バリデーションエラーがあるスキーマの場合、issues を含む validationResult を返す", async () => {
    const container = getContainer();
    const yaml = `
layout:
  - type: ROW
    fields:
      - code: name
        type: SINGLE_LINE_TEXT
        label: ""
`;
    container.schemaStorage.setContent(yaml);
    const result = await validateSchema({ container });
    expect(result.parseError).toBeUndefined();
    expect(result.validationResult).toBeDefined();
    expect(result.validationResult?.isValid).toBe(false);
    expect(result.validationResult?.issues.length).toBeGreaterThan(0);
  });

  it("パースエラーがあるスキーマの場合、parseError を返す", async () => {
    const container = getContainer();
    container.schemaStorage.setContent("{{invalid yaml");
    const result = await validateSchema({ container });
    expect(result.parseError).toBeDefined();
    expect(result.validationResult).toBeUndefined();
    expect(result.fieldCount).toBe(0);
  });

  it("空のスキーマテキストの場合、parseError を返す", async () => {
    const container = getContainer();
    container.schemaStorage.setContent("");
    const result = await validateSchema({ container });
    expect(result.parseError).toBeDefined();
    expect(result.fieldCount).toBe(0);
  });

  it("スキーマファイルが存在しない場合、ValidationError をスローする", async () => {
    const container = getContainer();
    await expect(validateSchema({ container })).rejects.toThrow(
      ValidationError,
    );
  });

  it("複数フィールドを含むスキーマの fieldCount が正しい", async () => {
    const container = getContainer();
    const yaml = `
layout:
  - type: ROW
    fields:
      - code: f1
        type: SINGLE_LINE_TEXT
        label: フィールド1
      - code: f2
        type: NUMBER
        label: フィールド2
      - code: f3
        type: DATE
        label: フィールド3
`;
    container.schemaStorage.setContent(yaml);
    const result = await validateSchema({ container });
    expect(result.fieldCount).toBe(3);
  });
});
