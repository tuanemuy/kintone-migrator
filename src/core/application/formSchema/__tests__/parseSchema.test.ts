import { describe, expect, it, vi } from "vitest";
import { configCodec } from "@/core/adapters/yaml/configCodec";
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
    const schema = parseSchemaText(configCodec, validYaml);
    expect(schema.fields.size).toBe(1);
    expect(schema.layout).toHaveLength(1);
  });

  it("不正なスキーマの場合、BusinessRuleErrorをValidationErrorに変換する", () => {
    expect(() => parseSchemaText(configCodec, "")).toThrow(ValidationError);
  });

  it("ValidationErrorのコードがINVALID_INPUTになる", () => {
    try {
      parseSchemaText(configCodec, "");
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
    expect(() => parseSchemaText(configCodec, duplicateYaml)).toThrow(
      ValidationError,
    );
  });

  it("BusinessRuleError以外のエラーはそのまま再スローする", () => {
    const originalError = new TypeError("unexpected error");
    vi.spyOn(SchemaParser, "parse").mockImplementation(() => {
      throw originalError;
    });

    expect(() => parseSchemaText(configCodec, validYaml)).toThrow(TypeError);
    expect(() => parseSchemaText(configCodec, validYaml)).not.toThrow(
      ValidationError,
    );

    vi.restoreAllMocks();
  });

  it("causeプロパティに元のBusinessRuleErrorが保持される", () => {
    const invalidSchemaYaml = "not_layout: true";
    try {
      parseSchemaText(configCodec, invalidSchemaYaml);
      expect.fail("エラーが発生するはず");
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      if (error instanceof ValidationError) {
        expect(error.cause).toBeDefined();
      }
    }
  });

  it("不正なYAMLの場合もValidationErrorになる", () => {
    expect(() => parseSchemaText(configCodec, "{{invalid")).toThrow(
      ValidationError,
    );
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
    expect(() => parseSchemaText(configCodec, invalidTypeYaml)).toThrow(
      ValidationError,
    );
  });

  it("パース結果のSchemaがフィールドマップとレイアウトを持つ", () => {
    const schema = parseSchemaText(configCodec, validYaml);
    expect(schema.fields).toBeInstanceOf(Map);
    expect(schema.fields.size).toBe(1);
    expect(Array.isArray(schema.layout)).toBe(true);
    expect(schema.layout).toHaveLength(1);
  });
});
