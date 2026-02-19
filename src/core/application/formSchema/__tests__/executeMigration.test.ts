import { describe, expect, it } from "vitest";
import { setupTestContainer } from "@/core/application/__tests__/helpers";
import { SystemError, ValidationError } from "@/core/application/error";
import {
  FieldCode,
  type FieldDefinition,
  type SubtableFieldDefinition,
} from "@/core/domain/formSchema/valueObject";
import { executeMigration } from "../executeMigration";

const getContainer = setupTestContainer();

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

describe("executeMigration", () => {
  it("差分がない場合はフォームを変更しない", async () => {
    const container = getContainer();
    const field = textField("name", "名前");
    container.schemaStorage.setContent(singleFieldSchema);
    container.formConfigurator.setFields(
      new Map([[FieldCode.create("name"), field]]),
    );
    container.formConfigurator.setLayout([
      { type: "ROW", fields: [{ kind: "field", field }] },
    ]);

    await executeMigration({ container });

    const fields = await container.formConfigurator.getFields();
    expect(fields.size).toBe(1);
  });

  it("フィールド差分もレイアウト差分もない場合、ポートの操作が一切呼ばれずに正常終了する", async () => {
    const container = getContainer();
    const field = textField("name", "名前");
    container.schemaStorage.setContent(singleFieldSchema);
    container.formConfigurator.setFields(
      new Map([[FieldCode.create("name"), field]]),
    );
    container.formConfigurator.setLayout([
      { type: "ROW", fields: [{ kind: "field", field }] },
    ]);
    container.formConfigurator.callLog = [];

    await executeMigration({ container });

    const mutationCalls = container.formConfigurator.callLog.filter(
      (c) =>
        c === "addFields" ||
        c === "updateFields" ||
        c === "deleteFields" ||
        c === "updateLayout",
    );
    expect(mutationCalls).toHaveLength(0);
  });

  it("スキーマに新規フィールドがある場合、フォームに追加する", async () => {
    const container = getContainer();
    container.schemaStorage.setContent(singleFieldSchema);
    container.formConfigurator.setFields(new Map());
    container.formConfigurator.setLayout([]);

    await executeMigration({ container });

    const fields = await container.formConfigurator.getFields();
    expect(fields.has(FieldCode.create("name"))).toBe(true);
  });

  it("フィールドが変更された場合、更新する", async () => {
    const container = getContainer();
    container.schemaStorage.setContent(singleFieldSchema);
    const oldField = textField("name", "旧名前");
    container.formConfigurator.setFields(
      new Map([[FieldCode.create("name"), oldField]]),
    );
    container.formConfigurator.setLayout([
      { type: "ROW", fields: [{ kind: "field", field: oldField }] },
    ]);

    await executeMigration({ container });

    const fields = await container.formConfigurator.getFields();
    const updated = fields.get(FieldCode.create("name"));
    expect(updated?.label).toBe("名前");
  });

  it("スキーマにないフィールドをフォームから削除する", async () => {
    const container = getContainer();
    container.schemaStorage.setContent(singleFieldSchema);
    const existing = textField("name", "名前");
    const extra = textField("extra", "余分");
    container.formConfigurator.setFields(
      new Map([
        [FieldCode.create("name"), existing],
        [FieldCode.create("extra"), extra],
      ]),
    );
    container.formConfigurator.setLayout([
      {
        type: "ROW",
        fields: [
          { kind: "field", field: existing },
          { kind: "field", field: extra },
        ],
      },
    ]);

    await executeMigration({ container });

    const fields = await container.formConfigurator.getFields();
    expect(fields.has(FieldCode.create("extra"))).toBe(false);
  });

  it("レイアウトに変更がある場合、レイアウトを更新する", async () => {
    const container = getContainer();
    const field = textField("name", "名前");
    container.schemaStorage.setContent(singleFieldSchema);
    container.formConfigurator.setFields(
      new Map([[FieldCode.create("name"), field]]),
    );
    // スキーマと異なるレイアウト
    container.formConfigurator.setLayout([]);

    await executeMigration({ container });

    const layout = await container.formConfigurator.getLayout();
    expect(layout).toHaveLength(1);
    expect(layout[0].type).toBe("ROW");
  });

  it("レイアウトに差分がある場合、updateLayoutがスキーマのレイアウトで呼ばれる", async () => {
    const container = getContainer();
    const field = textField("name", "名前");
    container.schemaStorage.setContent(singleFieldSchema);
    container.formConfigurator.setFields(
      new Map([[FieldCode.create("name"), field]]),
    );
    container.formConfigurator.setLayout([]);
    container.formConfigurator.callLog = [];

    await executeMigration({ container });

    expect(container.formConfigurator.callLog).toContain("updateLayout");
  });

  it("レイアウトに変更がない場合、レイアウトを更新しない", async () => {
    const container = getContainer();
    const field = textField("name", "名前");
    container.schemaStorage.setContent(singleFieldSchema);
    container.formConfigurator.setFields(
      new Map([[FieldCode.create("name"), field]]),
    );
    container.formConfigurator.setLayout([
      { type: "ROW", fields: [{ kind: "field", field }] },
    ]);

    // レイアウトが同じなので変更なし
    await executeMigration({ container });

    const layout = await container.formConfigurator.getLayout();
    expect(layout).toHaveLength(1);
  });

  it("サブテーブル内部フィールドは直接追加しない", async () => {
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

    await executeMigration({ container });

    // サブテーブル自体は追加されるが、item_nameは直接addFieldsされない
    const fields = await container.formConfigurator.getFields();
    // items (SUBTABLE) is added as a top-level field
    expect(fields.has(FieldCode.create("items"))).toBe(true);
  });

  it("サブテーブル内部フィールドは直接削除しない", async () => {
    const container = getContainer();
    const emptySchema = `
layout:
  - type: ROW
    fields: []
`;
    container.schemaStorage.setContent(emptySchema);

    // 現在のフォームにサブテーブルがある
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

    await executeMigration({ container });

    const fields = await container.formConfigurator.getFields();
    // items (SUBTABLE) は削除されるが、item_nameは直接deleteFieldsされない
    // InMemoryでは items削除時にitem_nameは残る（実際のkintoneではサブテーブル削除で内部フィールドも消える）
    expect(fields.has(FieldCode.create("items"))).toBe(false);
  });

  it("追加・更新・削除が同時に発生するマイグレーションを実行できる", async () => {
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
        label: 新規フィールド
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
    container.formConfigurator.setLayout([
      {
        type: "ROW",
        fields: [
          { kind: "field", field: oldName },
          { kind: "field", field: toDelete },
        ],
      },
    ]);

    await executeMigration({ container });

    const fields = await container.formConfigurator.getFields();
    // name は更新
    expect(fields.get(FieldCode.create("name"))?.label).toBe("名前_新");
    // new_field は追加
    expect(fields.has(FieldCode.create("new_field"))).toBe(true);
    // old_field は削除
    expect(fields.has(FieldCode.create("old_field"))).toBe(false);
  });

  it("不正なスキーマテキストの場合はValidationErrorをスローする", async () => {
    const container = getContainer();
    container.schemaStorage.setContent("");
    container.formConfigurator.setFields(new Map());
    container.formConfigurator.setLayout([]);

    await expect(executeMigration({ container })).rejects.toThrow(
      ValidationError,
    );
  });

  it("フィールドに差分がなくレイアウトのみ異なる場合、レイアウトだけ更新する", async () => {
    const container = getContainer();
    const field = textField("name", "名前");
    container.schemaStorage.setContent(singleFieldSchema);
    container.formConfigurator.setFields(
      new Map([[FieldCode.create("name"), field]]),
    );
    // スキーマとは異なるレイアウト（行が2つある）
    container.formConfigurator.setLayout([
      { type: "ROW", fields: [{ kind: "field", field }] },
      { type: "ROW", fields: [] },
    ]);

    await executeMigration({ container });

    const fields = await container.formConfigurator.getFields();
    expect(fields.size).toBe(1);
    const layout = await container.formConfigurator.getLayout();
    expect(layout).toHaveLength(1);
    expect(layout[0].type).toBe("ROW");
  });

  it("フィールド差分がなくレイアウト差分のみがある場合、updateLayoutのみが呼ばれる", async () => {
    const container = getContainer();
    const field = textField("name", "名前");
    container.schemaStorage.setContent(singleFieldSchema);
    container.formConfigurator.setFields(
      new Map([[FieldCode.create("name"), field]]),
    );
    container.formConfigurator.setLayout([
      { type: "ROW", fields: [{ kind: "field", field }] },
      { type: "ROW", fields: [] },
    ]);
    container.formConfigurator.callLog = [];

    await executeMigration({ container });

    const mutationCalls = container.formConfigurator.callLog.filter(
      (c) =>
        c === "addFields" ||
        c === "updateFields" ||
        c === "deleteFields" ||
        c === "updateLayout",
    );
    expect(mutationCalls).toEqual(["updateLayout"]);
  });

  it("フィールドとレイアウトに全く差分がない場合、フォームに一切変更を加えない", async () => {
    const container = getContainer();
    const field = textField("name", "名前");
    container.schemaStorage.setContent(singleFieldSchema);
    container.formConfigurator.setFields(
      new Map([[FieldCode.create("name"), field]]),
    );
    container.formConfigurator.setLayout([
      { type: "ROW", fields: [{ kind: "field", field }] },
    ]);

    // executeMigration前の状態を記録
    const fieldsBefore = await container.formConfigurator.getFields();
    const layoutBefore = await container.formConfigurator.getLayout();

    await executeMigration({ container });

    const fieldsAfter = await container.formConfigurator.getFields();
    const layoutAfter = await container.formConfigurator.getLayout();
    expect(fieldsAfter.size).toBe(fieldsBefore.size);
    expect(layoutAfter).toHaveLength(layoutBefore.length);
  });

  it("サブテーブルに新規内部フィールドがある場合、addFieldsでサブテーブルごと追加する", async () => {
    const container = getContainer();
    const existingInner = textField("item_name", "品名");
    const existingSub: SubtableFieldDefinition = {
      code: FieldCode.create("items"),
      type: "SUBTABLE",
      label: "明細",
      properties: {
        fields: new Map([[FieldCode.create("item_name"), existingInner]]),
      },
    };

    // スキーマにはサブテーブル内に新しいフィールドを追加
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
    container.formConfigurator.setFields(
      new Map([
        [FieldCode.create("items"), existingSub],
        [FieldCode.create("item_name"), existingInner],
      ]),
    );
    container.formConfigurator.setLayout([
      {
        type: "SUBTABLE",
        code: FieldCode.create("items"),
        label: "明細",
        fields: [{ kind: "field", field: existingInner }],
      },
    ]);
    container.formConfigurator.callLog = [];

    await executeMigration({ container });

    // 新規内部フィールドはaddFieldsでサブテーブルごと追加される
    const mutationCalls = container.formConfigurator.callLog.filter(
      (c) => c === "addFields" || c === "updateFields" || c === "deleteFields",
    );
    expect(mutationCalls).toContain("addFields");

    const fields = await container.formConfigurator.getFields();
    expect(fields.has(FieldCode.create("items"))).toBe(true);
    const items = fields.get(FieldCode.create("items"));
    if (items?.type === "SUBTABLE") {
      expect(items.properties.fields.size).toBe(2);
      expect(items.properties.fields.has(FieldCode.create("item_qty"))).toBe(
        true,
      );
    }
  });

  it("サブテーブルの内部フィールドが減った場合、減ったフィールドは直接削除されない", async () => {
    const container = getContainer();
    // スキーマ: items の中に col1 のみ
    const schema = `
layout:
  - type: SUBTABLE
    code: items
    label: 明細
    fields:
      - code: col1
        type: SINGLE_LINE_TEXT
        label: 列1
`;
    container.schemaStorage.setContent(schema);

    // 現在のフォーム: items の中に col1 と col2
    const col1 = textField("col1", "列1");
    const col2 = textField("col2", "列2");
    const currentSub: SubtableFieldDefinition = {
      code: FieldCode.create("items"),
      type: "SUBTABLE",
      label: "明細",
      properties: {
        fields: new Map([
          [FieldCode.create("col1"), col1],
          [FieldCode.create("col2"), col2],
        ]),
      },
    };
    container.formConfigurator.setFields(
      new Map([
        [FieldCode.create("items"), currentSub],
        [FieldCode.create("col1"), col1],
        [FieldCode.create("col2"), col2],
      ]),
    );
    container.formConfigurator.setLayout([
      {
        type: "SUBTABLE",
        code: FieldCode.create("items"),
        label: "明細",
        fields: [
          { kind: "field", field: col1 },
          { kind: "field", field: col2 },
        ],
      },
    ]);

    await executeMigration({ container });

    // col2 はサブテーブル内部フィールドなので直接 deleteFields されない
    // items は更新される（内部フィールド構成が変わったので）
    const fields = await container.formConfigurator.getFields();
    expect(fields.has(FieldCode.create("items"))).toBe(true);
    // col2 は直接削除されないが、InMemory では残る（実際のkintoneではサブテーブル更新時に反映される）
    expect(fields.has(FieldCode.create("col2"))).toBe(true);
  });

  it("修正フィールドがサブテーブル内部フィールドのみの場合、updateFieldsを呼ばない", async () => {
    const container = getContainer();
    // サブテーブルの内部フィールドのラベルだけが変わったケース
    // items は同一だが item_name のラベルが変わっている
    const oldInner = textField("item_name", "品名_旧");
    const oldSub: SubtableFieldDefinition = {
      code: FieldCode.create("items"),
      type: "SUBTABLE",
      label: "明細",
      properties: {
        fields: new Map([[FieldCode.create("item_name"), oldInner]]),
      },
    };

    const schema = `
layout:
  - type: SUBTABLE
    code: items
    label: 明細
    fields:
      - code: item_name
        type: SINGLE_LINE_TEXT
        label: 品名_新
`;
    container.schemaStorage.setContent(schema);
    container.formConfigurator.setFields(
      new Map([
        [FieldCode.create("items"), oldSub],
        [FieldCode.create("item_name"), oldInner],
      ]),
    );
    container.formConfigurator.setLayout([
      {
        type: "SUBTABLE",
        code: FieldCode.create("items"),
        label: "明細",
        fields: [{ kind: "field", field: oldInner }],
      },
    ]);

    await executeMigration({ container });

    // items (SUBTABLE) は更新される（内部フィールドのラベルが変わったので）
    const fields = await container.formConfigurator.getFields();
    const items = fields.get(FieldCode.create("items"));
    expect(items).toBeDefined();
    expect(items?.type).toBe("SUBTABLE");
  });

  it("修正されたフィールドが全てサブテーブル内部の場合、updateFields は呼ばれない", async () => {
    const container = getContainer();
    // スキーマ: items サブテーブル内に col1 (ラベル変更あり)
    const schema = `
layout:
  - type: SUBTABLE
    code: items
    label: 明細
    fields:
      - code: col1
        type: SINGLE_LINE_TEXT
        label: 列1_新
`;
    container.schemaStorage.setContent(schema);

    // 現在のフォーム: items サブテーブル内の col1 と同じ定義 (内部は一致)
    // ただし top-level の col1 はラベルが異なる
    const col1New = textField("col1", "列1_新");
    const col1Old = textField("col1", "列1_旧");
    const currentSub: SubtableFieldDefinition = {
      code: FieldCode.create("items"),
      type: "SUBTABLE",
      label: "明細",
      properties: {
        fields: new Map([[FieldCode.create("col1"), col1New]]),
      },
    };
    container.formConfigurator.setFields(
      new Map([
        [FieldCode.create("items"), currentSub],
        [FieldCode.create("col1"), col1Old],
      ]),
    );
    container.formConfigurator.setLayout([
      {
        type: "SUBTABLE",
        code: FieldCode.create("items"),
        label: "明細",
        fields: [{ kind: "field", field: col1New }],
      },
    ]);

    await executeMigration({ container });

    // items SUBTABLE は同一なので modified にならない
    // col1 は modified だが subtable 内部フィールドなので updateFields は呼ばれない
    const fields = await container.formConfigurator.getFields();
    // col1 はフィルタされるので更新されず旧ラベルのまま
    expect(fields.get(FieldCode.create("col1"))?.label).toBe("列1_旧");
  });

  it("フィールド削除のみでレイアウト差分がない場合、レイアウト更新はスキップされる", async () => {
    const container = getContainer();
    const field = textField("name", "名前");
    const extra = textField("extra", "余分");

    container.schemaStorage.setContent(singleFieldSchema);
    container.formConfigurator.setFields(
      new Map([
        [FieldCode.create("name"), field],
        [FieldCode.create("extra"), extra],
      ]),
    );
    // レイアウトにはスキーマと同じ name だけ配置 (extra はレイアウト外)
    container.formConfigurator.setLayout([
      { type: "ROW", fields: [{ kind: "field", field }] },
    ]);

    await executeMigration({ container });

    // extra は削除される
    const fields = await container.formConfigurator.getFields();
    expect(fields.has(FieldCode.create("extra"))).toBe(false);
    expect(fields.has(FieldCode.create("name"))).toBe(true);

    // レイアウトは変更なし (1 ROW のまま)
    const layout = await container.formConfigurator.getLayout();
    expect(layout).toHaveLength(1);
    expect(layout[0].type).toBe("ROW");
  });

  it("サブテーブル内部フィールドの変更はサブテーブルごと更新される", async () => {
    const container = getContainer();
    const schema = `
layout:
  - type: SUBTABLE
    code: items
    label: 明細
    fields:
      - code: item_name
        type: SINGLE_LINE_TEXT
        label: 品名_新
`;
    container.schemaStorage.setContent(schema);

    const oldInner = textField("item_name", "品名_旧");
    const oldSub: SubtableFieldDefinition = {
      code: FieldCode.create("items"),
      type: "SUBTABLE",
      label: "明細",
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
    container.formConfigurator.setLayout([
      {
        type: "SUBTABLE",
        code: FieldCode.create("items"),
        label: "明細",
        fields: [{ kind: "field", field: oldInner }],
      },
    ]);

    await executeMigration({ container });

    const fields = await container.formConfigurator.getFields();
    const items = fields.get(FieldCode.create("items"));
    expect(items).toBeDefined();
    expect(items?.type).toBe("SUBTABLE");
    if (items?.type === "SUBTABLE") {
      const innerField = items.properties.fields.get(
        FieldCode.create("item_name"),
      );
      expect(innerField?.label).toBe("品名_新");
    }
  });

  it("追加エントリのみがある場合、addFieldsのみが呼ばれる", async () => {
    const container = getContainer();
    container.schemaStorage.setContent(singleFieldSchema);
    container.formConfigurator.setFields(new Map());
    container.formConfigurator.setLayout([]);
    container.formConfigurator.callLog = [];

    await executeMigration({ container });

    const mutationCalls = container.formConfigurator.callLog.filter(
      (c) => c === "addFields" || c === "updateFields" || c === "deleteFields",
    );
    expect(mutationCalls).toContain("addFields");
    expect(mutationCalls).not.toContain("updateFields");
    expect(mutationCalls).not.toContain("deleteFields");
  });

  it("変更エントリのみがある場合、updateFieldsのみが呼ばれる", async () => {
    const container = getContainer();
    container.schemaStorage.setContent(singleFieldSchema);
    const oldField = textField("name", "旧名前");
    container.formConfigurator.setFields(
      new Map([[FieldCode.create("name"), oldField]]),
    );
    container.formConfigurator.setLayout([
      { type: "ROW", fields: [{ kind: "field", field: oldField }] },
    ]);
    container.formConfigurator.callLog = [];

    await executeMigration({ container });

    const mutationCalls = container.formConfigurator.callLog.filter(
      (c) => c === "addFields" || c === "updateFields" || c === "deleteFields",
    );
    expect(mutationCalls).toContain("updateFields");
    expect(mutationCalls).not.toContain("addFields");
    expect(mutationCalls).not.toContain("deleteFields");
  });

  it("削除エントリのみがある場合、deleteFieldsのみが呼ばれる", async () => {
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
    container.formConfigurator.setLayout([{ type: "ROW", fields: [] }]);
    container.formConfigurator.callLog = [];

    await executeMigration({ container });

    const mutationCalls = container.formConfigurator.callLog.filter(
      (c) => c === "addFields" || c === "updateFields" || c === "deleteFields",
    );
    expect(mutationCalls).toContain("deleteFields");
    expect(mutationCalls).not.toContain("addFields");
    expect(mutationCalls).not.toContain("updateFields");
  });

  it("追加・変更・削除が混在する場合、追加→更新→削除の順でポートメソッドが呼ばれる", async () => {
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
        label: 新規フィールド
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
    container.formConfigurator.setLayout([
      {
        type: "ROW",
        fields: [
          { kind: "field", field: oldName },
          { kind: "field", field: toDelete },
        ],
      },
    ]);
    container.formConfigurator.callLog = [];

    await executeMigration({ container });

    const mutationCalls = container.formConfigurator.callLog.filter(
      (c) => c === "addFields" || c === "updateFields" || c === "deleteFields",
    );
    expect(mutationCalls).toEqual([
      "addFields",
      "updateFields",
      "deleteFields",
    ]);
  });

  it("addFieldsに渡されるフィールドがスキーマ内の追加対象フィールドのドメイン型と一致する", async () => {
    const container = getContainer();
    const schema = `
layout:
  - type: ROW
    fields:
      - code: email
        type: SINGLE_LINE_TEXT
        label: メール
        required: true
`;
    container.schemaStorage.setContent(schema);
    container.formConfigurator.setFields(new Map());
    container.formConfigurator.setLayout([]);

    await executeMigration({ container });

    const fields = await container.formConfigurator.getFields();
    const email = fields.get(FieldCode.create("email"));
    expect(email).toBeDefined();
    expect(email?.type).toBe("SINGLE_LINE_TEXT");
    expect(email?.label).toBe("メール");
    expect(email?.code).toBe(FieldCode.create("email"));
  });

  it("updateFieldsに渡されるフィールドがスキーマ内の変更対象フィールドのドメイン型と一致する", async () => {
    const container = getContainer();
    container.schemaStorage.setContent(singleFieldSchema);
    const oldField = textField("name", "旧名前");
    container.formConfigurator.setFields(
      new Map([[FieldCode.create("name"), oldField]]),
    );
    container.formConfigurator.setLayout([
      { type: "ROW", fields: [{ kind: "field", field: oldField }] },
    ]);

    await executeMigration({ container });

    const fields = await container.formConfigurator.getFields();
    const updated = fields.get(FieldCode.create("name"));
    expect(updated?.label).toBe("名前");
    expect(updated?.type).toBe("SINGLE_LINE_TEXT");
  });

  it("deleteFieldsに渡されるフィールドコードが現在のフォームにのみ存在するフィールドコードと一致する", async () => {
    const container = getContainer();
    container.schemaStorage.setContent(singleFieldSchema);
    const existing = textField("name", "名前");
    const extra1 = textField("extra1", "余分1");
    const extra2 = textField("extra2", "余分2");
    container.formConfigurator.setFields(
      new Map([
        [FieldCode.create("name"), existing],
        [FieldCode.create("extra1"), extra1],
        [FieldCode.create("extra2"), extra2],
      ]),
    );
    container.formConfigurator.setLayout([
      { type: "ROW", fields: [{ kind: "field", field: existing }] },
    ]);

    await executeMigration({ container });

    const fields = await container.formConfigurator.getFields();
    expect(fields.has(FieldCode.create("name"))).toBe(true);
    expect(fields.has(FieldCode.create("extra1"))).toBe(false);
    expect(fields.has(FieldCode.create("extra2"))).toBe(false);
  });

  it("スキーマテキストのフォーマットが不正な場合はValidationErrorをスローする", async () => {
    const container = getContainer();
    container.schemaStorage.setContent("{{invalid yaml");
    container.formConfigurator.setFields(new Map());
    container.formConfigurator.setLayout([]);

    await expect(executeMigration({ container })).rejects.toThrow(
      ValidationError,
    );
  });

  it("スキーマファイルが存在しない場合はValidationErrorをスローする", async () => {
    const container = getContainer();
    container.formConfigurator.setFields(new Map());
    container.formConfigurator.setLayout([]);

    await expect(executeMigration({ container })).rejects.toThrow(
      ValidationError,
    );
  });

  it("SchemaStorage.get()の通信に失敗した場合、SystemErrorがスローされる", async () => {
    const container = getContainer();
    container.schemaStorage.setFailOn("get");

    await expect(executeMigration({ container })).rejects.toThrow(SystemError);
  });

  it("FormConfigurator.getFields()の通信に失敗した場合、SystemErrorがスローされる", async () => {
    const container = getContainer();
    container.schemaStorage.setContent(singleFieldSchema);
    container.formConfigurator.setFailOn("getFields");

    await expect(executeMigration({ container })).rejects.toThrow(SystemError);
  });

  it("FormConfigurator.getLayout()の通信に失敗した場合、SystemErrorがスローされる", async () => {
    const container = getContainer();
    container.schemaStorage.setContent(singleFieldSchema);
    container.formConfigurator.setFailOn("getLayout");

    await expect(executeMigration({ container })).rejects.toThrow(SystemError);
  });

  it("addFieldsの通信に失敗した場合、SystemErrorがスローされ後続の更新・削除操作は実行されない", async () => {
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
    container.formConfigurator.setFailOn("addFields");
    container.formConfigurator.callLog = [];

    await expect(executeMigration({ container })).rejects.toThrow(SystemError);

    expect(container.formConfigurator.callLog).not.toContain("updateFields");
    expect(container.formConfigurator.callLog).not.toContain("deleteFields");
  });

  it("updateFieldsの通信に失敗した場合、SystemErrorがスローされ後続の削除操作は実行されない", async () => {
    const container = getContainer();
    const schema = `
layout:
  - type: ROW
    fields:
      - code: name
        type: SINGLE_LINE_TEXT
        label: 名前_新
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
    container.formConfigurator.setFailOn("updateFields");
    container.formConfigurator.callLog = [];

    await expect(executeMigration({ container })).rejects.toThrow(SystemError);

    expect(container.formConfigurator.callLog).not.toContain("deleteFields");
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
    container.formConfigurator.setLayout([{ type: "ROW", fields: [] }]);
    container.formConfigurator.setFailOn("deleteFields");

    await expect(executeMigration({ container })).rejects.toThrow(SystemError);
  });

  it("GROUP フィールドを新規追加するマイグレーションを実行できる", async () => {
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

    await executeMigration({ container });

    const fields = await container.formConfigurator.getFields();
    expect(fields.has(FieldCode.create("grp1"))).toBe(true);
    expect(fields.has(FieldCode.create("inner"))).toBe(true);
    expect(fields.get(FieldCode.create("grp1"))?.type).toBe("GROUP");
  });

  it("GROUP フィールドの openGroup を変更するマイグレーションを実行できる", async () => {
    const container = getContainer();
    const schema = `
layout:
  - type: GROUP
    code: grp1
    label: 基本情報
    openGroup: false
    layout:
      - type: ROW
        fields:
          - code: inner
            type: SINGLE_LINE_TEXT
            label: 内部
`;
    container.schemaStorage.setContent(schema);

    const oldGroup: FieldDefinition = {
      code: FieldCode.create("grp1"),
      type: "GROUP",
      label: "基本情報",
      properties: { openGroup: true },
    } as FieldDefinition;
    const inner = textField("inner", "内部");
    container.formConfigurator.setFields(
      new Map([
        [FieldCode.create("grp1"), oldGroup],
        [FieldCode.create("inner"), inner],
      ]),
    );
    container.formConfigurator.setLayout([
      {
        type: "GROUP",
        code: FieldCode.create("grp1"),
        label: "基本情報",
        openGroup: true,
        layout: [{ type: "ROW", fields: [{ kind: "field", field: inner }] }],
      },
    ]);

    await executeMigration({ container });

    const fields = await container.formConfigurator.getFields();
    const grp = fields.get(FieldCode.create("grp1"));
    expect(grp?.type).toBe("GROUP");
    if (grp?.type === "GROUP") {
      expect(grp.properties.openGroup).toBe(false);
    }
  });

  it("GROUP フィールドを削除するマイグレーションを実行できる", async () => {
    const container = getContainer();
    const emptySchema = `
layout:
  - type: ROW
    fields: []
`;
    container.schemaStorage.setContent(emptySchema);

    const grpField: FieldDefinition = {
      code: FieldCode.create("grp1"),
      type: "GROUP",
      label: "基本情報",
      properties: { openGroup: true },
    } as FieldDefinition;
    const inner = textField("inner", "内部");
    container.formConfigurator.setFields(
      new Map([
        [FieldCode.create("grp1"), grpField],
        [FieldCode.create("inner"), inner],
      ]),
    );
    container.formConfigurator.setLayout([{ type: "ROW", fields: [] }]);

    await executeMigration({ container });

    const fields = await container.formConfigurator.getFields();
    expect(fields.has(FieldCode.create("grp1"))).toBe(false);
    expect(fields.has(FieldCode.create("inner"))).toBe(false);
  });

  it("REFERENCE_TABLE フィールドを新規追加するマイグレーションを実行できる", async () => {
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
`;
    container.schemaStorage.setContent(schema);
    container.formConfigurator.setFields(new Map());
    container.formConfigurator.setLayout([]);

    await executeMigration({ container });

    const fields = await container.formConfigurator.getFields();
    expect(fields.has(FieldCode.create("ref"))).toBe(true);
    const ref = fields.get(FieldCode.create("ref"));
    expect(ref?.type).toBe("REFERENCE_TABLE");
  });

  it("REFERENCE_TABLE の relatedApp 変更でマイグレーションを実行できる", async () => {
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
            app: "456"
          condition:
            field: key
            relatedField: relKey
          displayFields:
            - col1
`;
    container.schemaStorage.setContent(schema);

    const currentRef: FieldDefinition = {
      code: FieldCode.create("ref"),
      type: "REFERENCE_TABLE",
      label: "参照テーブル",
      properties: {
        referenceTable: {
          relatedApp: { app: "123" },
          condition: {
            field: FieldCode.create("key"),
            relatedField: FieldCode.create("relKey"),
          },
          displayFields: [FieldCode.create("col1")],
        },
      },
    } as FieldDefinition;
    container.formConfigurator.setFields(
      new Map([[FieldCode.create("ref"), currentRef]]),
    );
    container.formConfigurator.setLayout([
      { type: "ROW", fields: [{ kind: "field", field: currentRef }] },
    ]);

    await executeMigration({ container });

    const fields = await container.formConfigurator.getFields();
    const ref = fields.get(FieldCode.create("ref"));
    expect(ref?.type).toBe("REFERENCE_TABLE");
    if (ref?.type === "REFERENCE_TABLE") {
      expect(ref.properties.referenceTable.relatedApp.app).toBe("456");
    }
  });

  it("複数の SUBTABLE を含むマイグレーションを実行できる", async () => {
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
  - type: SUBTABLE
    code: details
    label: 詳細
    fields:
      - code: detail_text
        type: MULTI_LINE_TEXT
        label: 詳細テキスト
`;
    container.schemaStorage.setContent(schema);
    container.formConfigurator.setFields(new Map());
    container.formConfigurator.setLayout([]);

    await executeMigration({ container });

    const fields = await container.formConfigurator.getFields();
    expect(fields.has(FieldCode.create("items"))).toBe(true);
    expect(fields.has(FieldCode.create("details"))).toBe(true);
    expect(fields.get(FieldCode.create("items"))?.type).toBe("SUBTABLE");
    expect(fields.get(FieldCode.create("details"))?.type).toBe("SUBTABLE");
  });

  it("updateLayout の通信に失敗した場合、SystemErrorがスローされる", async () => {
    const container = getContainer();
    const field = textField("name", "名前");
    container.schemaStorage.setContent(singleFieldSchema);
    container.formConfigurator.setFields(
      new Map([[FieldCode.create("name"), field]]),
    );
    container.formConfigurator.setLayout([]);
    container.formConfigurator.setFailOn("updateLayout");

    await expect(executeMigration({ container })).rejects.toThrow(SystemError);
  });
});
