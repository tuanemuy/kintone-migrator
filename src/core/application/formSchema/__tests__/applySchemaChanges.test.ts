import { describe, expect, it } from "vitest";
import { configCodec } from "@/core/adapters/yaml/configCodec";
import { setupTestFormSchemaContainer } from "@/core/application/__tests__/helpers";
import { ValidationError } from "@/core/application/error";
import { SchemaParser } from "@/core/domain/formSchema/services/schemaParser";
import {
  FieldCode,
  type FieldDefinition,
  type SubtableFieldDefinition,
} from "@/core/domain/formSchema/valueObject";
import { applySchemaChanges } from "../applySchemaChanges";

const getContainer = setupTestFormSchemaContainer();

function textField(code: string, label: string): FieldDefinition {
  return {
    code: FieldCode.create(code),
    type: "SINGLE_LINE_TEXT",
    label,
    properties: {},
  } as FieldDefinition;
}

function parse(yaml: string) {
  return SchemaParser.parse(configCodec.parse(yaml));
}

describe("applySchemaChanges", () => {
  it("Schema を直接渡して追加・更新を適用できる", async () => {
    const container = getContainer();
    const schema = parse(`
layout:
  - type: ROW
    fields:
      - code: name
        type: SINGLE_LINE_TEXT
        label: 名前
`);
    container.formConfigurator.setFields(new Map());
    container.formConfigurator.setLayout([]);

    await applySchemaChanges(schema, { container });

    const fields = await container.formConfigurator.getFields();
    expect(fields.has(FieldCode.create("name"))).toBe(true);
  });

  it("expectedRevision を全 mutation に引き回す", async () => {
    const container = getContainer();
    const schema = parse(`
layout:
  - type: ROW
    fields:
      - code: name
        type: SINGLE_LINE_TEXT
        label: 名前
`);
    container.formConfigurator.setFields(new Map());
    container.formConfigurator.setLayout([]);

    await applySchemaChanges(schema, { container, expectedRevision: "11" });

    expect(
      container.formConfigurator.expectedRevisions.every((r) => r === "11"),
    ).toBe(true);
  });

  it("型変更は ValidationError で弾かれる（AC-13）", async () => {
    const container = getContainer();
    const schema = parse(`
layout:
  - type: ROW
    fields:
      - code: f1
        type: NUMBER
        label: 数値
`);
    const existing = textField("f1", "数値");
    container.formConfigurator.setFields(
      new Map([[FieldCode.create("f1"), existing]]),
    );
    container.formConfigurator.setLayout([
      { type: "ROW", fields: [{ kind: "field", field: existing }] },
    ]);

    await expect(applySchemaChanges(schema, { container })).rejects.toThrow(
      ValidationError,
    );
  });

  it("既存サブテーブルへのフィールド追加は ValidationError で弾かれる（AC-13）", async () => {
    const container = getContainer();
    const schema = parse(`
layout:
  - type: SUBTABLE
    code: items
    label: 明細
    fields:
      - code: col1
        type: SINGLE_LINE_TEXT
        label: 列1
      - code: col2
        type: NUMBER
        label: 列2
`);
    const col1 = textField("col1", "列1");
    const sub: SubtableFieldDefinition = {
      code: FieldCode.create("items"),
      type: "SUBTABLE",
      label: "明細",
      properties: {
        fields: new Map([[FieldCode.create("col1"), col1]]),
      },
    };
    container.formConfigurator.setFields(
      new Map([
        [FieldCode.create("items"), sub],
        [FieldCode.create("col1"), col1],
      ]),
    );
    container.formConfigurator.setLayout([
      {
        type: "SUBTABLE",
        code: FieldCode.create("items"),
        label: "明細",
        fields: [{ kind: "field", field: col1 }],
      },
    ]);

    await expect(applySchemaChanges(schema, { container })).rejects.toThrow(
      ValidationError,
    );
  });
});
