import { describe, expect, it } from "vitest";
import type { Schema } from "@/core/domain/formSchema/entity";
import type {
  FieldCode,
  FieldDefinition,
} from "@/core/domain/formSchema/valueObject";
import { isValidationError } from "../../error";
import { assertSchemaValid } from "../assertSchemaValid";

function makeField(code: string, label: string): FieldDefinition {
  return {
    code: code as FieldCode,
    label,
    type: "SINGLE_LINE_TEXT",
    properties: {},
  };
}

function makeValidSchema(): Schema {
  const field = makeField("name", "名前");
  const fields = new Map<FieldCode, FieldDefinition>();
  fields.set(field.code, field);
  return {
    fields,
    layout: [
      {
        type: "ROW",
        fields: [{ kind: "field", field }],
      },
    ],
  };
}

function makeInvalidSchema(): Schema {
  // ラベルが空文字 → EMPTY_LABEL バリデーションエラー
  const field = makeField("name", "");
  const fields = new Map<FieldCode, FieldDefinition>();
  fields.set(field.code, field);
  return {
    fields,
    layout: [
      {
        type: "ROW",
        fields: [{ kind: "field", field }],
      },
    ],
  };
}

describe("assertSchemaValid", () => {
  it("有効なスキーマの場合、エラーをスローしない", () => {
    const schema = makeValidSchema();
    expect(() => assertSchemaValid(schema)).not.toThrow();
  });

  it("無効なスキーマの場合、ValidationErrorをスローする", () => {
    const schema = makeInvalidSchema();
    try {
      assertSchemaValid(schema);
      expect.fail("Expected ValidationError to be thrown");
    } catch (error) {
      expect(isValidationError(error)).toBe(true);
      if (isValidationError(error)) {
        expect(error.message).toContain("Schema validation failed");
      }
    }
  });
});
