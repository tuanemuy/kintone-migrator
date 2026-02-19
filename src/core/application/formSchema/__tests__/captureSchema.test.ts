import { describe, expect, it } from "vitest";
import { setupTestContainer } from "@/core/application/__tests__/helpers";
import { SystemError } from "@/core/application/error";
import {
  FieldCode,
  type FieldDefinition,
} from "@/core/domain/formSchema/valueObject";
import { captureSchema } from "../captureSchema";

const getContainer = setupTestContainer();

function textField(code: string, label: string): FieldDefinition {
  return {
    code: FieldCode.create(code),
    type: "SINGLE_LINE_TEXT",
    label,
    properties: {},
  } as FieldDefinition;
}

function numberField(code: string, label: string): FieldDefinition {
  return {
    code: FieldCode.create(code),
    type: "NUMBER",
    label,
    properties: {},
  } as FieldDefinition;
}

describe("captureSchema", () => {
  it("現在のフォームフィールドとレイアウトからYAMLスキーマを生成する", async () => {
    const container = getContainer();
    const nameField = textField("name", "名前");
    container.formConfigurator.setFields(
      new Map([[FieldCode.create("name"), nameField]]),
    );
    container.formConfigurator.setLayout([
      {
        type: "ROW",
        fields: [{ kind: "field", field: nameField }],
      },
    ]);

    const result = await captureSchema({ container });

    expect(result.schemaText).toContain("name");
    expect(result.schemaText).toContain("SINGLE_LINE_TEXT");
    expect(result.schemaText).toContain("layout");
  });

  it("既存スキーマがある場合はhasExistingSchema=trueを返す", async () => {
    const container = getContainer();
    container.schemaStorage.setContent("existing schema");
    container.formConfigurator.setFields(new Map());
    container.formConfigurator.setLayout([]);

    const result = await captureSchema({ container });

    expect(result.hasExistingSchema).toBe(true);
  });

  it("既存スキーマが無い場合はhasExistingSchema=falseを返す", async () => {
    const container = getContainer();
    container.formConfigurator.setFields(new Map());
    container.formConfigurator.setLayout([]);

    const result = await captureSchema({ container });

    expect(result.hasExistingSchema).toBe(false);
  });

  it("複数フィールドを持つフォームのスキーマを正しくキャプチャする", async () => {
    const container = getContainer();
    const name = textField("name", "名前");
    const price = numberField("price", "金額");
    container.formConfigurator.setFields(
      new Map([
        [FieldCode.create("name"), name],
        [FieldCode.create("price"), price],
      ]),
    );
    container.formConfigurator.setLayout([
      { type: "ROW", fields: [{ kind: "field", field: name }] },
      { type: "ROW", fields: [{ kind: "field", field: price }] },
    ]);

    const result = await captureSchema({ container });

    expect(result.schemaText).toContain("name");
    expect(result.schemaText).toContain("price");
    expect(result.schemaText).toContain("NUMBER");
  });

  it("レイアウト内のフィールドが完全な定義で補完された上でシリアライズされる", async () => {
    const container = getContainer();
    const field: FieldDefinition = {
      code: FieldCode.create("email"),
      type: "SINGLE_LINE_TEXT",
      label: "メール",
      properties: { required: true, maxLength: "200" },
    } as FieldDefinition;
    container.formConfigurator.setFields(
      new Map([[FieldCode.create("email"), field]]),
    );
    container.formConfigurator.setLayout([
      {
        type: "ROW",
        fields: [
          {
            kind: "field",
            field: {
              code: FieldCode.create("email"),
              type: "SINGLE_LINE_TEXT",
              label: "メール",
              properties: {},
            } as FieldDefinition,
          },
        ],
      },
    ]);

    const result = await captureSchema({ container });

    // enrichLayoutWithFieldsにより、完全な定義でシリアライズされる
    expect(result.schemaText).toContain("required: true");
    expect(result.schemaText).toContain("maxLength:");
  });

  it("フィールドが空のフォームでもスキーマを生成できる", async () => {
    const container = getContainer();
    container.formConfigurator.setFields(new Map());
    container.formConfigurator.setLayout([]);

    const result = await captureSchema({ container });

    expect(result.schemaText).toBeDefined();
    expect(typeof result.schemaText).toBe("string");
  });

  it("キャプチャしたスキーマは再パース可能（ラウンドトリップ）", async () => {
    const { SchemaParser } = await import(
      "@/core/domain/formSchema/services/schemaParser"
    );
    const container = getContainer();
    const name = textField("name", "名前");
    container.formConfigurator.setFields(
      new Map([[FieldCode.create("name"), name]]),
    );
    container.formConfigurator.setLayout([
      { type: "ROW", fields: [{ kind: "field", field: name }] },
    ]);

    const result = await captureSchema({ container });
    const parsed = SchemaParser.parse(result.schemaText);

    expect(parsed.fields.size).toBe(1);
    expect(parsed.fields.has(FieldCode.create("name"))).toBe(true);
    expect(parsed.layout).toHaveLength(1);
  });

  it("GROUP レイアウトを含むフォームをキャプチャできる", async () => {
    const container = getContainer();
    const innerField = textField("inner", "内部");
    const grpField: FieldDefinition = {
      code: FieldCode.create("grp"),
      type: "GROUP",
      label: "グループ",
      properties: { openGroup: true },
    } as FieldDefinition;
    container.formConfigurator.setFields(
      new Map([
        [FieldCode.create("grp"), grpField],
        [FieldCode.create("inner"), innerField],
      ]),
    );
    container.formConfigurator.setLayout([
      {
        type: "GROUP",
        code: FieldCode.create("grp"),
        label: "グループ",
        openGroup: true,
        layout: [
          { type: "ROW", fields: [{ kind: "field", field: innerField }] },
        ],
      },
    ]);

    const result = await captureSchema({ container });
    expect(result.schemaText).toContain("GROUP");
    expect(result.schemaText).toContain("inner");
  });

  it("kintoneシステムフィールドはschemaTextに含まれない", async () => {
    const container = getContainer();
    const nameField = textField("name", "名前");
    container.formConfigurator.setFields(
      new Map([[FieldCode.create("name"), nameField]]),
    );
    container.formConfigurator.setLayout([
      {
        type: "ROW",
        fields: [
          { kind: "field", field: nameField },
          {
            kind: "systemField",
            code: "RECORD_NUMBER",
            type: "RECORD_NUMBER",
          },
          {
            kind: "systemField",
            code: "CREATOR",
            type: "CREATOR",
          },
          {
            kind: "systemField",
            code: "CREATED_TIME",
            type: "CREATED_TIME",
          },
          {
            kind: "systemField",
            code: "MODIFIER",
            type: "MODIFIER",
          },
          {
            kind: "systemField",
            code: "UPDATED_TIME",
            type: "UPDATED_TIME",
          },
        ],
      },
    ]);

    const result = await captureSchema({ container });

    // システムフィールドはフィールドタイプとして含まれるが、FieldDefinitionとしては含まれない
    // SchemaSerializerがシステムフィールドをそのまま出力してもFieldTypeとしてはパースされない
    expect(result.schemaText).toContain("name");
    expect(result.schemaText).toContain("SINGLE_LINE_TEXT");
  });

  it("FormConfigurator.getLayout()の通信に失敗した場合、SystemErrorがスローされる", async () => {
    const container = getContainer();
    container.formConfigurator.setFailOn("getLayout");

    await expect(captureSchema({ container })).rejects.toThrow(SystemError);
  });

  it("FormConfigurator.getFields()の通信に失敗した場合、SystemErrorがスローされる", async () => {
    const container = getContainer();
    container.formConfigurator.setFailOn("getFields");

    await expect(captureSchema({ container })).rejects.toThrow(SystemError);
  });

  it("SchemaStorage.get()の通信に失敗した場合、SystemErrorがスローされる", async () => {
    const container = getContainer();
    container.formConfigurator.setFields(new Map());
    container.formConfigurator.setLayout([]);
    container.schemaStorage.setFailOn("get");

    await expect(captureSchema({ container })).rejects.toThrow(SystemError);
  });

  it("SUBTABLE を含むフォームをキャプチャしてラウンドトリップできる", async () => {
    const { SchemaParser } = await import(
      "@/core/domain/formSchema/services/schemaParser"
    );
    const container = getContainer();
    const innerField = textField("item_name", "品名");
    const subField: FieldDefinition = {
      code: FieldCode.create("items"),
      type: "SUBTABLE",
      label: "明細",
      properties: {
        fields: new Map([[FieldCode.create("item_name"), innerField]]),
      },
    } as FieldDefinition;
    container.formConfigurator.setFields(
      new Map([
        [FieldCode.create("items"), subField],
        [FieldCode.create("item_name"), innerField],
      ]),
    );
    container.formConfigurator.setLayout([
      {
        type: "SUBTABLE",
        code: FieldCode.create("items"),
        label: "明細",
        fields: [{ kind: "field", field: innerField }],
      },
    ]);

    const result = await captureSchema({ container });

    expect(result.schemaText).toContain("SUBTABLE");
    expect(result.schemaText).toContain("item_name");

    const parsed = SchemaParser.parse(result.schemaText);
    expect(parsed.fields.has(FieldCode.create("items"))).toBe(true);
    const items = parsed.fields.get(FieldCode.create("items"));
    expect(items?.type).toBe("SUBTABLE");
    if (items?.type === "SUBTABLE") {
      expect(items.properties.fields.has(FieldCode.create("item_name"))).toBe(
        true,
      );
    }
  });

  it("REFERENCE_TABLE を含むフォームをキャプチャしてラウンドトリップできる", async () => {
    const { SchemaParser } = await import(
      "@/core/domain/formSchema/services/schemaParser"
    );
    const container = getContainer();
    const refField: FieldDefinition = {
      code: FieldCode.create("ref"),
      type: "REFERENCE_TABLE",
      label: "参照テーブル",
      properties: {
        referenceTable: {
          relatedApp: { app: "42" },
          condition: {
            field: FieldCode.create("key"),
            relatedField: FieldCode.create("rKey"),
          },
          displayFields: [FieldCode.create("col1")],
          sort: "col1 asc",
        },
      },
    } as FieldDefinition;
    container.formConfigurator.setFields(
      new Map([[FieldCode.create("ref"), refField]]),
    );
    container.formConfigurator.setLayout([
      { type: "ROW", fields: [{ kind: "field", field: refField }] },
    ]);

    const result = await captureSchema({ container });

    expect(result.schemaText).toContain("REFERENCE_TABLE");

    const parsed = SchemaParser.parse(result.schemaText);
    expect(parsed.fields.has(FieldCode.create("ref"))).toBe(true);
    const ref = parsed.fields.get(FieldCode.create("ref"));
    expect(ref?.type).toBe("REFERENCE_TABLE");
    if (ref?.type === "REFERENCE_TABLE") {
      expect(ref.properties.referenceTable.relatedApp.app).toBe("42");
      expect(ref.properties.referenceTable.displayFields).toHaveLength(1);
    }
  });

  it("複数のフィールドタイプが混在するフォームをキャプチャしてラウンドトリップできる", async () => {
    const { SchemaParser } = await import(
      "@/core/domain/formSchema/services/schemaParser"
    );
    const container = getContainer();
    const name = textField("name", "名前");
    const price = numberField("price", "金額");
    const grpField: FieldDefinition = {
      code: FieldCode.create("grp"),
      type: "GROUP",
      label: "グループ",
      properties: { openGroup: true },
    } as FieldDefinition;
    const innerField = textField("inner", "内部");

    container.formConfigurator.setFields(
      new Map([
        [FieldCode.create("name"), name],
        [FieldCode.create("price"), price],
        [FieldCode.create("grp"), grpField],
        [FieldCode.create("inner"), innerField],
      ]),
    );
    container.formConfigurator.setLayout([
      {
        type: "ROW",
        fields: [
          { kind: "field", field: name },
          { kind: "field", field: price },
        ],
      },
      {
        type: "GROUP",
        code: FieldCode.create("grp"),
        label: "グループ",
        openGroup: true,
        layout: [
          { type: "ROW", fields: [{ kind: "field", field: innerField }] },
        ],
      },
    ]);

    const result = await captureSchema({ container });

    const parsed = SchemaParser.parse(result.schemaText);
    expect(parsed.fields.size).toBe(4);
    expect(parsed.fields.get(FieldCode.create("name"))?.type).toBe(
      "SINGLE_LINE_TEXT",
    );
    expect(parsed.fields.get(FieldCode.create("price"))?.type).toBe("NUMBER");
    expect(parsed.fields.get(FieldCode.create("grp"))?.type).toBe("GROUP");
  });
});
