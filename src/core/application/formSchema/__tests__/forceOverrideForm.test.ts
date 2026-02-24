import { describe, expect, it } from "vitest";
import { setupTestFormSchemaContainer } from "@/core/application/__tests__/helpers";
import { SystemError, ValidationError } from "@/core/application/error";
import {
  FieldCode,
  type FieldDefinition,
  type SubtableFieldDefinition,
} from "@/core/domain/formSchema/valueObject";
import { forceOverrideForm } from "../forceOverrideForm";

const getContainer = setupTestFormSchemaContainer();

function textField(
  code: string,
  label: string,
  props: Record<string, unknown> = {},
): FieldDefinition {
  return {
    code: FieldCode.create(code),
    type: "SINGLE_LINE_TEXT",
    label,
    properties: props,
  } as FieldDefinition;
}

const singleFieldSchema = `
layout:
  - type: ROW
    fields:
      - code: name
        type: SINGLE_LINE_TEXT
        label: 名前
`;

describe("forceOverrideForm", () => {
  it("フォームが空の場合、スキーマのフィールドを全て追加する", async () => {
    const container = getContainer();
    container.schemaStorage.setContent(singleFieldSchema);
    container.formConfigurator.setFields(new Map());
    container.formConfigurator.setLayout([]);

    await forceOverrideForm({ container });

    const fields = await container.formConfigurator.getFields();
    expect(fields.has(FieldCode.create("name"))).toBe(true);
    expect(fields.size).toBe(1);
  });

  it("既存フィールドがスキーマにある場合、更新する", async () => {
    const container = getContainer();
    container.schemaStorage.setContent(singleFieldSchema);
    const oldField = textField("name", "旧名前");
    container.formConfigurator.setFields(
      new Map([[FieldCode.create("name"), oldField]]),
    );
    container.formConfigurator.setLayout([]);

    await forceOverrideForm({ container });

    const fields = await container.formConfigurator.getFields();
    expect(fields.get(FieldCode.create("name"))?.label).toBe("名前");
  });

  it("スキーマにないフィールドはフォームから削除する", async () => {
    const container = getContainer();
    container.schemaStorage.setContent(singleFieldSchema);
    const existing = textField("name", "名前");
    const extra = textField("extra", "余分なフィールド");
    container.formConfigurator.setFields(
      new Map([
        [FieldCode.create("name"), existing],
        [FieldCode.create("extra"), extra],
      ]),
    );
    container.formConfigurator.setLayout([]);

    await forceOverrideForm({ container });

    const fields = await container.formConfigurator.getFields();
    expect(fields.has(FieldCode.create("extra"))).toBe(false);
  });

  it("差分に関わらずスキーマの全フィールドを上書きする", async () => {
    const container = getContainer();
    container.schemaStorage.setContent(singleFieldSchema);
    // 同じフィールドが既にあっても、updateFieldsで上書きされる
    const sameField = textField("name", "名前");
    container.formConfigurator.setFields(
      new Map([[FieldCode.create("name"), sameField]]),
    );
    container.formConfigurator.setLayout([]);

    await forceOverrideForm({ container });

    const fields = await container.formConfigurator.getFields();
    expect(fields.has(FieldCode.create("name"))).toBe(true);
  });

  it("スキーマと現在のフォーム設定が完全に一致する場合でも、全フィールドのupdateFieldsが実行される", async () => {
    const container = getContainer();
    container.schemaStorage.setContent(singleFieldSchema);
    const sameField = textField("name", "名前");
    container.formConfigurator.setFields(
      new Map([[FieldCode.create("name"), sameField]]),
    );
    container.formConfigurator.setLayout([
      { type: "ROW", fields: [{ kind: "field", field: sameField }] },
    ]);
    container.formConfigurator.resetCallLog();

    await forceOverrideForm({ container });

    expect(container.formConfigurator.callLog).toContain("updateFields");
    expect(container.formConfigurator.callLog).toContain("updateLayout");
  });

  it("レイアウトを常にスキーマのレイアウトで上書きする", async () => {
    const container = getContainer();
    container.schemaStorage.setContent(singleFieldSchema);
    container.formConfigurator.setFields(new Map());
    container.formConfigurator.setLayout([]);

    await forceOverrideForm({ container });

    const layout = await container.formConfigurator.getLayout();
    expect(layout).toHaveLength(1);
    expect(layout[0].type).toBe("ROW");
  });

  it("フィールド操作の後にupdateLayoutがスキーマのレイアウトで呼ばれる", async () => {
    const container = getContainer();
    container.schemaStorage.setContent(singleFieldSchema);
    container.formConfigurator.setFields(new Map());
    container.formConfigurator.setLayout([]);
    container.formConfigurator.resetCallLog();

    await forceOverrideForm({ container });

    const allCalls = container.formConfigurator.callLog;
    const addIdx = allCalls.indexOf("addFields");
    const layoutIdx = allCalls.indexOf("updateLayout");
    expect(layoutIdx).toBeGreaterThan(-1);
    if (addIdx >= 0) {
      expect(addIdx).toBeLessThan(layoutIdx);
    }
  });

  it("サブテーブル内部フィールドは直接追加・更新しない", async () => {
    const container = getContainer();
    const schema = `
layout:
  - type: SUBTABLE
    code: items
    label: 明細
    fields:
      - code: item_name
        type: SINGLE_LINE_TEXT
        label: 品名
`;
    container.schemaStorage.setContent(schema);
    container.formConfigurator.setFields(new Map());
    container.formConfigurator.setLayout([]);

    await forceOverrideForm({ container });

    const fields = await container.formConfigurator.getFields();
    // サブテーブル自体は追加される
    expect(fields.has(FieldCode.create("items"))).toBe(true);
    // item_nameはサブテーブル内部なので直接addFieldsされない
    // (InMemoryではサブテーブルのproperties.fieldsに含まれる)
  });

  it("現在のフォームのサブテーブル内部フィールドは直接削除しない", async () => {
    const container = getContainer();
    const emptySchema = `
layout:
  - type: ROW
    fields: []
`;
    container.schemaStorage.setContent(emptySchema);

    const innerField = textField("item_name", "品名");
    const subField: SubtableFieldDefinition = {
      code: FieldCode.create("items"),
      type: "SUBTABLE",
      label: "明細",
      properties: {
        fields: new Map([[FieldCode.create("item_name"), innerField]]),
      },
    };
    container.formConfigurator.setFields(
      new Map([
        [FieldCode.create("items"), subField],
        [FieldCode.create("item_name"), innerField],
      ]),
    );
    container.formConfigurator.setLayout([]);

    await forceOverrideForm({ container });

    const fields = await container.formConfigurator.getFields();
    // items自体は削除される(スキーマにない)
    expect(fields.has(FieldCode.create("items"))).toBe(false);
    // item_nameはサブテーブル内部フィールドなので直接deleteFieldsされない
    expect(fields.has(FieldCode.create("item_name"))).toBe(true);
  });

  it("追加・更新・削除が同時に発生する上書きを実行できる", async () => {
    const container = getContainer();
    const schema = `
layout:
  - type: ROW
    fields:
      - code: name
        type: SINGLE_LINE_TEXT
        label: 名前_新
      - code: new_field
        type: NUMBER
        label: 新規
`;
    container.schemaStorage.setContent(schema);

    const oldName = textField("name", "名前_旧");
    const toDelete = textField("old_field", "削除対象");
    container.formConfigurator.setFields(
      new Map([
        [FieldCode.create("name"), oldName],
        [FieldCode.create("old_field"), toDelete],
      ]),
    );
    container.formConfigurator.setLayout([]);

    await forceOverrideForm({ container });

    const fields = await container.formConfigurator.getFields();
    expect(fields.get(FieldCode.create("name"))?.label).toBe("名前_新");
    expect(fields.has(FieldCode.create("new_field"))).toBe(true);
    expect(fields.has(FieldCode.create("old_field"))).toBe(false);
  });

  it("不正なスキーマテキストの場合はValidationErrorをスローする", async () => {
    const container = getContainer();
    container.schemaStorage.setContent("");
    container.formConfigurator.setFields(new Map());
    container.formConfigurator.setLayout([]);

    await expect(forceOverrideForm({ container })).rejects.toThrow(
      ValidationError,
    );
  });

  it("フィールドに差分がなくてもレイアウトは必ず更新される", async () => {
    const container = getContainer();
    const field = textField("name", "名前");
    container.schemaStorage.setContent(singleFieldSchema);
    container.formConfigurator.setFields(
      new Map([[FieldCode.create("name"), field]]),
    );
    // 元のレイアウトはスキーマと異なる（空）
    container.formConfigurator.setLayout([]);

    await forceOverrideForm({ container });

    const layout = await container.formConfigurator.getLayout();
    expect(layout).toHaveLength(1);
    expect(layout[0].type).toBe("ROW");
  });

  it("スキーマのフィールドもフォームのフィールドも空の場合、レイアウトだけ上書きされる", async () => {
    const container = getContainer();
    const emptySchema = `
layout:
  - type: ROW
    fields: []
`;
    container.schemaStorage.setContent(emptySchema);
    container.formConfigurator.setFields(new Map());
    container.formConfigurator.setLayout([]);

    await forceOverrideForm({ container });

    const fields = await container.formConfigurator.getFields();
    expect(fields.size).toBe(0);
    const layout = await container.formConfigurator.getLayout();
    expect(layout).toHaveLength(1);
  });

  it("GROUP を含むスキーマで強制上書きできる", async () => {
    const container = getContainer();
    const schema = `
layout:
  - type: GROUP
    code: grp1
    label: 基本情報
    openGroup: true
    layout:
      - type: ROW
        fields:
          - code: inner
            type: SINGLE_LINE_TEXT
            label: 内部
`;
    container.schemaStorage.setContent(schema);
    container.formConfigurator.setFields(new Map());
    container.formConfigurator.setLayout([]);

    await forceOverrideForm({ container });

    const fields = await container.formConfigurator.getFields();
    expect(fields.has(FieldCode.create("grp1"))).toBe(true);
    expect(fields.has(FieldCode.create("inner"))).toBe(true);
  });

  it("追加・更新・削除が必要な場合、追加→更新→削除の順でポートメソッドが呼ばれる", async () => {
    const container = getContainer();
    const schema = `
layout:
  - type: ROW
    fields:
      - code: name
        type: SINGLE_LINE_TEXT
        label: 名前_新
      - code: new_field
        type: NUMBER
        label: 新規
`;
    container.schemaStorage.setContent(schema);
    const oldName = textField("name", "名前_旧");
    const toDelete = textField("old_field", "削除対象");
    container.formConfigurator.setFields(
      new Map([
        [FieldCode.create("name"), oldName],
        [FieldCode.create("old_field"), toDelete],
      ]),
    );
    container.formConfigurator.setLayout([]);
    container.formConfigurator.resetCallLog();

    await forceOverrideForm({ container });

    const mutationCalls = container.formConfigurator.callLog.filter(
      (c) => c === "addFields" || c === "updateFields" || c === "deleteFields",
    );
    expect(mutationCalls).toEqual([
      "addFields",
      "updateFields",
      "deleteFields",
    ]);
  });

  it("スキーマにフィールドが0件で現在のフォームにのみフィールドが存在する場合、削除後にupdateLayoutが実行される", async () => {
    const container = getContainer();
    const emptyFieldSchema = `
layout:
  - type: ROW
    fields: []
`;
    container.schemaStorage.setContent(emptyFieldSchema);
    const extra = textField("extra", "余分");
    container.formConfigurator.setFields(
      new Map([[FieldCode.create("extra"), extra]]),
    );
    container.formConfigurator.setLayout([]);
    container.formConfigurator.resetCallLog();

    await forceOverrideForm({ container });

    const fields = await container.formConfigurator.getFields();
    expect(fields.has(FieldCode.create("extra"))).toBe(false);

    const mutationCalls = container.formConfigurator.callLog.filter(
      (c) =>
        c === "addFields" ||
        c === "updateFields" ||
        c === "deleteFields" ||
        c === "updateLayout",
    );
    expect(mutationCalls).toContain("deleteFields");
    expect(mutationCalls).toContain("updateLayout");
    const deleteIdx = mutationCalls.indexOf("deleteFields");
    const layoutIdx = mutationCalls.indexOf("updateLayout");
    expect(deleteIdx).toBeLessThan(layoutIdx);
  });

  it("スキーマテキストのフォーマットが不正な場合はValidationErrorをスローする", async () => {
    const container = getContainer();
    container.schemaStorage.setContent("{{invalid yaml");
    container.formConfigurator.setFields(new Map());
    container.formConfigurator.setLayout([]);

    await expect(forceOverrideForm({ container })).rejects.toThrow(
      ValidationError,
    );
  });

  it("スキーマファイルが存在しない場合はValidationErrorをスローする", async () => {
    const container = getContainer();
    container.formConfigurator.setFields(new Map());
    container.formConfigurator.setLayout([]);

    await expect(forceOverrideForm({ container })).rejects.toThrow(
      ValidationError,
    );
  });

  it("SchemaStorage.get()の通信に失敗した場合、SystemErrorがスローされる", async () => {
    const container = getContainer();
    container.schemaStorage.setFailOn("get");

    await expect(forceOverrideForm({ container })).rejects.toThrow(SystemError);
  });

  it("FormConfigurator.getFields()の通信に失敗した場合、SystemErrorがスローされる", async () => {
    const container = getContainer();
    container.schemaStorage.setContent(singleFieldSchema);
    container.formConfigurator.setFailOn("getFields");

    await expect(forceOverrideForm({ container })).rejects.toThrow(SystemError);
  });

  it("addFieldsの通信に失敗した場合、SystemErrorがスローされ後続の更新・削除操作は実行されない", async () => {
    const container = getContainer();
    const schema = `
layout:
  - type: ROW
    fields:
      - code: new_field
        type: NUMBER
        label: 新規
`;
    container.schemaStorage.setContent(schema);
    container.formConfigurator.setFields(new Map());
    container.formConfigurator.setLayout([]);
    container.formConfigurator.setFailOn("addFields");
    container.formConfigurator.resetCallLog();

    await expect(forceOverrideForm({ container })).rejects.toThrow(SystemError);

    expect(container.formConfigurator.callLog).not.toContain("updateFields");
    expect(container.formConfigurator.callLog).not.toContain("deleteFields");
    expect(container.formConfigurator.callLog).not.toContain("updateLayout");
  });

  it("updateFieldsの通信に失敗した場合、SystemErrorがスローされ後続の削除操作は実行されない", async () => {
    const container = getContainer();
    container.schemaStorage.setContent(singleFieldSchema);
    const existing = textField("name", "旧名前");
    const toDelete = textField("old_field", "削除対象");
    container.formConfigurator.setFields(
      new Map([
        [FieldCode.create("name"), existing],
        [FieldCode.create("old_field"), toDelete],
      ]),
    );
    container.formConfigurator.setLayout([]);
    container.formConfigurator.setFailOn("updateFields");
    container.formConfigurator.resetCallLog();

    await expect(forceOverrideForm({ container })).rejects.toThrow(SystemError);

    expect(container.formConfigurator.callLog).not.toContain("deleteFields");
    expect(container.formConfigurator.callLog).not.toContain("updateLayout");
  });

  it("deleteFieldsの通信に失敗した場合、SystemErrorがスローされる", async () => {
    const container = getContainer();
    const emptySchema = `
layout:
  - type: ROW
    fields: []
`;
    container.schemaStorage.setContent(emptySchema);
    const extra = textField("extra", "余分");
    container.formConfigurator.setFields(
      new Map([[FieldCode.create("extra"), extra]]),
    );
    container.formConfigurator.setLayout([]);
    container.formConfigurator.setFailOn("deleteFields");

    await expect(forceOverrideForm({ container })).rejects.toThrow(SystemError);
  });

  it("SUBTABLE を含むスキーマで強制上書きできる", async () => {
    const container = getContainer();
    const schema = `
layout:
  - type: SUBTABLE
    code: items
    label: 明細
    fields:
      - code: item_name
        type: SINGLE_LINE_TEXT
        label: 品名
      - code: item_qty
        type: NUMBER
        label: 数量
`;
    container.schemaStorage.setContent(schema);
    container.formConfigurator.setFields(new Map());
    container.formConfigurator.setLayout([]);

    await forceOverrideForm({ container });

    const fields = await container.formConfigurator.getFields();
    expect(fields.has(FieldCode.create("items"))).toBe(true);
    const items = fields.get(FieldCode.create("items"));
    expect(items?.type).toBe("SUBTABLE");
    if (items?.type === "SUBTABLE") {
      expect(items.properties.fields.size).toBe(2);
    }
  });

  it("REFERENCE_TABLE を含むスキーマで強制上書きできる", async () => {
    const container = getContainer();
    const schema = `
layout:
  - type: ROW
    fields:
      - code: ref
        type: REFERENCE_TABLE
        label: 参照テーブル
        referenceTable:
          relatedApp:
            app: "123"
          condition:
            field: key
            relatedField: relKey
          displayFields:
            - col1
            - col2
          filterCond: 'status = "active"'
          sort: col1 asc
`;
    container.schemaStorage.setContent(schema);
    container.formConfigurator.setFields(new Map());
    container.formConfigurator.setLayout([]);

    await forceOverrideForm({ container });

    const fields = await container.formConfigurator.getFields();
    expect(fields.has(FieldCode.create("ref"))).toBe(true);
    const ref = fields.get(FieldCode.create("ref"));
    expect(ref?.type).toBe("REFERENCE_TABLE");
  });

  it("既存の SUBTABLE を新しい内部フィールド構成で上書きする", async () => {
    const container = getContainer();
    const schema = `
layout:
  - type: SUBTABLE
    code: items
    label: 明細_新
    fields:
      - code: item_name
        type: SINGLE_LINE_TEXT
        label: 品名
      - code: item_price
        type: NUMBER
        label: 単価
`;
    container.schemaStorage.setContent(schema);

    const oldInner = textField("item_name", "品名");
    const oldSub: SubtableFieldDefinition = {
      code: FieldCode.create("items"),
      type: "SUBTABLE",
      label: "明細_旧",
      properties: {
        fields: new Map([[FieldCode.create("item_name"), oldInner]]),
      },
    };
    container.formConfigurator.setFields(
      new Map([
        [FieldCode.create("items"), oldSub],
        [FieldCode.create("item_name"), oldInner],
      ]),
    );
    container.formConfigurator.setLayout([]);
    container.formConfigurator.resetCallLog();

    await forceOverrideForm({ container });

    // 新規内部フィールドはaddFieldsで追加される
    const mutationCalls = container.formConfigurator.callLog.filter(
      (c) => c === "addFields" || c === "updateFields" || c === "deleteFields",
    );
    expect(mutationCalls).toContain("addFields");

    const fields = await container.formConfigurator.getFields();
    const items = fields.get(FieldCode.create("items"));
    expect(items?.type).toBe("SUBTABLE");
    expect(items?.label).toBe("明細_新");
    if (items?.type === "SUBTABLE") {
      expect(items.properties.fields.size).toBe(2);
      expect(items.properties.fields.has(FieldCode.create("item_price"))).toBe(
        true,
      );
    }
  });

  it("updateLayout の通信に失敗した場合、SystemErrorがスローされる", async () => {
    const container = getContainer();
    container.schemaStorage.setContent(singleFieldSchema);
    container.formConfigurator.setFields(new Map());
    container.formConfigurator.setLayout([]);
    container.formConfigurator.setFailOn("updateLayout");

    await expect(forceOverrideForm({ container })).rejects.toThrow(SystemError);
  });
});
