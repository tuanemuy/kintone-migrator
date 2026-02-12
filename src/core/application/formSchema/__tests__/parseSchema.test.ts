import { describe, expect, it, vi } from "vitest";
import { ValidationError } from "@/core/application/error";
import { SchemaParser } from "@/core/domain/formSchema/services/schemaParser";
import { parseSchemaText } from "../parseSchema";

const validYaml = `
layout:
  - type: ROW
    fields:
      - code: name
        type: SINGLE_LINE_TEXT
        label: 名前
`;

describe("parseSchemaText", () => {
  it("有効なYAMLスキーマをパースしてSchemaを返す", () => {
    const schema = parseSchemaText(validYaml);
    expect(schema.fields.size).toBe(1);
    expect(schema.layout).toHaveLength(1);
  });

  it("不正なスキーマの場合、BusinessRuleErrorをValidationErrorに変換する", () => {
    expect(() => parseSchemaText("")).toThrow(ValidationError);
  });

  it("ValidationErrorのコードがINVALID_INPUTになる", () => {
    try {
      parseSchemaText("");
      expect.fail("エラーが発生するはず");
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      if (error instanceof ValidationError) {
        expect(error.code).toBe("INVALID_INPUT");
      }
    }
  });

  it("重複フィールドコードの場合もValidationErrorになる", () => {
    const duplicateYaml = `
layout:
  - type: ROW
    fields:
      - code: name
        type: SINGLE_LINE_TEXT
        label: 名前1
      - code: name
        type: SINGLE_LINE_TEXT
        label: 名前2
`;
    expect(() => parseSchemaText(duplicateYaml)).toThrow(ValidationError);
  });

  it("BusinessRuleError以外のエラーはそのまま再スローする", () => {
    const originalError = new TypeError("unexpected error");
    vi.spyOn(SchemaParser, "parse").mockImplementation(() => {
      throw originalError;
    });

    expect(() => parseSchemaText(validYaml)).toThrow(TypeError);
    expect(() => parseSchemaText(validYaml)).not.toThrow(ValidationError);

    vi.restoreAllMocks();
  });

  it("causeプロパティに元のBusinessRuleErrorが保持される", () => {
    try {
      parseSchemaText("");
      expect.fail("エラーが発生するはず");
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      if (error instanceof ValidationError) {
        expect(error.cause).toBeDefined();
      }
    }
  });

  it("不正なYAMLの場合もValidationErrorになる", () => {
    expect(() => parseSchemaText("{{invalid")).toThrow(ValidationError);
  });

  it("未知のフィールド型を含むスキーマの場合もValidationErrorになる", () => {
    const invalidTypeYaml = `
layout:
  - type: ROW
    fields:
      - code: bad
        type: UNKNOWN_TYPE
        label: 不正
`;
    expect(() => parseSchemaText(invalidTypeYaml)).toThrow(ValidationError);
  });

  it("パース結果のSchemaがフィールドマップとレイアウトを持つ", () => {
    const schema = parseSchemaText(validYaml);
    expect(schema.fields).toBeInstanceOf(Map);
    expect(schema.fields.size).toBe(1);
    expect(Array.isArray(schema.layout)).toBe(true);
    expect(schema.layout).toHaveLength(1);
  });
});
