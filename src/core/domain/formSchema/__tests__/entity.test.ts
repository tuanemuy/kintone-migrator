import { describe, expect, it } from "vitest";
import { buildDiffResult } from "../../diff";
import type { FormLayout, LayoutRow } from "../entity";
import { Schema } from "../entity";
import {
  collectSubtableInnerFieldCodes,
  enrichLayoutWithFields,
} from "../services/layoutEnricher";
import {
  FieldCode,
  type FieldDefinition,
  type FormSchemaDiffEntry,
  type SubtableFieldDefinition,
} from "../valueObject";

// --- Helpers ---

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

function numberField(
  code: string,
  label: string,
  props: Record<string, unknown> = {},
): FieldDefinition {
  return {
    code: FieldCode.create(code),
    type: "NUMBER",
    label,
    properties: props,
  } as FieldDefinition;
}

function subtableField(
  code: string,
  label: string,
  innerFields: ReadonlyMap<FieldCode, FieldDefinition>,
): SubtableFieldDefinition {
  return {
    code: FieldCode.create(code),
    type: "SUBTABLE",
    label,
    properties: { fields: innerFields },
  };
}

function groupField(
  code: string,
  label: string,
  openGroup?: boolean,
): FieldDefinition {
  return {
    code: FieldCode.create(code),
    type: "GROUP",
    label,
    properties: { openGroup },
  } as FieldDefinition;
}

// --- buildDiffResult for FormSchemaDiffEntry ---

describe("buildDiffResult for FormSchemaDiffEntry", () => {
  it("空のエントリから空のFormSchemaDiffを生成する", () => {
    const diff = buildDiffResult<FormSchemaDiffEntry>([]);
    expect(diff.isEmpty).toBe(true);
    expect(diff.entries).toHaveLength(0);
    expect(diff.summary).toEqual({
      added: 0,
      modified: 0,
      deleted: 0,
      total: 0,
    });
  });

  it("エントリ数からサマリーを正しく集計する", () => {
    const entries: FormSchemaDiffEntry[] = [
      {
        type: "added",
        fieldCode: FieldCode.create("f1"),
        fieldLabel: "F1",
        details: "new",
        after: textField("f1", "F1"),
      },
      {
        type: "added",
        fieldCode: FieldCode.create("f2"),
        fieldLabel: "F2",
        details: "new",
        after: textField("f2", "F2"),
      },
      {
        type: "modified",
        fieldCode: FieldCode.create("f3"),
        fieldLabel: "F3",
        details: "label changed",
        before: textField("f3", "Old"),
        after: textField("f3", "F3"),
      },
      {
        type: "deleted",
        fieldCode: FieldCode.create("f4"),
        fieldLabel: "F4",
        details: "removed",
        before: textField("f4", "F4"),
      },
    ];

    const diff = buildDiffResult(entries);
    expect(diff.isEmpty).toBe(false);
    expect(diff.summary).toEqual({
      added: 2,
      modified: 1,
      deleted: 1,
      total: 4,
    });
  });

  it("エントリをadded→modified→deletedの順にソートする", () => {
    const entries: FormSchemaDiffEntry[] = [
      {
        type: "deleted",
        fieldCode: FieldCode.create("d1"),
        fieldLabel: "D1",
        details: "removed",
        before: textField("d1", "D1"),
      },
      {
        type: "added",
        fieldCode: FieldCode.create("a1"),
        fieldLabel: "A1",
        details: "new",
        after: textField("a1", "A1"),
      },
      {
        type: "modified",
        fieldCode: FieldCode.create("m1"),
        fieldLabel: "M1",
        details: "changed",
        before: textField("m1", "Old"),
        after: textField("m1", "M1"),
      },
    ];

    const diff = buildDiffResult(entries);
    expect(diff.entries[0].type).toBe("added");
    expect(diff.entries[1].type).toBe("modified");
    expect(diff.entries[2].type).toBe("deleted");
  });
});

// --- Schema.create ---

describe("Schema.create", () => {
  it("fieldsとlayoutからSchemaを生成する", () => {
    const fields = new Map<FieldCode, FieldDefinition>([
      [FieldCode.create("name"), textField("name", "名前")],
    ]);
    const layout: FormLayout = [
      {
        type: "ROW",
        fields: [{ kind: "field", field: textField("name", "名前") }],
      },
    ];
    const schema = Schema.create(fields, layout);
    expect(schema.fields.size).toBe(1);
    expect(schema.layout).toHaveLength(1);
  });
});

// --- enrichLayoutWithFields ---

describe("enrichLayoutWithFields", () => {
  it("ROW内のフィールドを完全な定義で補完する", () => {
    const fullField = textField("name", "名前", {
      required: true,
      maxLength: "100",
    });
    const fields = new Map<FieldCode, FieldDefinition>([
      [FieldCode.create("name"), fullField],
    ]);
    const layout: FormLayout = [
      {
        type: "ROW",
        fields: [
          {
            kind: "field",
            field: textField("name", "名前"),
            size: { width: "200" },
          },
        ],
      },
    ];

    const enriched = enrichLayoutWithFields(layout, fields);
    const row = enriched[0] as LayoutRow;
    const element = row.fields[0];
    expect(element.kind).toBe("field");
    if (element.kind === "field") {
      expect(element.field).toEqual(fullField);
      expect(element.size).toEqual({ width: "200" });
    }
  });

  it("GROUP内のフィールドを補完しラベル・openGroupを反映する", () => {
    const innerField = numberField("price", "金額", { required: true });
    const grp = groupField("grp1", "基本情報", true);
    const fields = new Map<FieldCode, FieldDefinition>([
      [FieldCode.create("grp1"), grp],
      [FieldCode.create("price"), innerField],
    ]);
    const layout: FormLayout = [
      {
        type: "GROUP",
        code: FieldCode.create("grp1"),
        label: "旧ラベル",
        layout: [
          {
            type: "ROW",
            fields: [{ kind: "field", field: numberField("price", "金額") }],
          },
        ],
      },
    ];

    const enriched = enrichLayoutWithFields(layout, fields);
    const group = enriched[0];
    expect(group.type).toBe("GROUP");
    if (group.type === "GROUP") {
      expect(group.label).toBe("基本情報");
      expect(group.openGroup).toBe(true);
      const row = group.layout[0];
      const el = row.fields[0];
      if (el.kind === "field") {
        expect(el.field).toEqual(innerField);
      }
    }
  });

  it("SUBTABLE内のフィールドをサブテーブルのフィールドMapから補完する", () => {
    const subField = textField("item", "品目", { required: true });
    const sub = subtableField(
      "items",
      "明細",
      new Map([[FieldCode.create("item"), subField]]),
    );
    const fields = new Map<FieldCode, FieldDefinition>([
      [FieldCode.create("items"), sub],
    ]);
    const layout: FormLayout = [
      {
        type: "SUBTABLE",
        code: FieldCode.create("items"),
        label: "旧ラベル",
        fields: [{ kind: "field", field: textField("item", "品目") }],
      },
    ];

    const enriched = enrichLayoutWithFields(layout, fields);
    const subtable = enriched[0];
    expect(subtable.type).toBe("SUBTABLE");
    if (subtable.type === "SUBTABLE") {
      expect(subtable.label).toBe("明細");
      const el = subtable.fields[0];
      if (el.kind === "field") {
        expect(el.field).toEqual(subField);
      }
    }
  });

  it("デコレーション要素はそのまま保持する", () => {
    const fields = new Map<FieldCode, FieldDefinition>();
    const layout: FormLayout = [
      {
        type: "ROW",
        fields: [
          {
            kind: "decoration",
            type: "LABEL",
            label: "見出し",
            elementId: "lbl1",
            size: { width: "200" },
          },
          {
            kind: "decoration",
            type: "HR",
            elementId: "hr1",
            size: { width: "100" },
          },
        ],
      },
    ];

    const enriched = enrichLayoutWithFields(layout, fields);
    const row = enriched[0] as LayoutRow;
    expect(row.fields).toHaveLength(2);
    expect(row.fields[0]).toEqual({
      kind: "decoration",
      type: "LABEL",
      label: "見出し",
      elementId: "lbl1",
      size: { width: "200" },
    });
  });

  it("fieldsに存在しないフィールドコードの要素はそのまま残す", () => {
    const fields = new Map<FieldCode, FieldDefinition>();
    const orphanField = textField("orphan", "孤児");
    const layout: FormLayout = [
      {
        type: "ROW",
        fields: [{ kind: "field", field: orphanField }],
      },
    ];

    const enriched = enrichLayoutWithFields(layout, fields);
    const row = enriched[0] as LayoutRow;
    const el = row.fields[0];
    if (el.kind === "field") {
      expect(el.field).toEqual(orphanField);
    }
  });

  it("GROUP定義にnoLabelがある場合、enriched結果にnoLabelが反映される", () => {
    const grp: FieldDefinition = {
      code: FieldCode.create("grp1"),
      type: "GROUP",
      label: "基本情報",
      noLabel: true,
      properties: { openGroup: false },
    } as FieldDefinition;
    const fields = new Map<FieldCode, FieldDefinition>([
      [FieldCode.create("grp1"), grp],
    ]);
    const layout: FormLayout = [
      {
        type: "GROUP",
        code: FieldCode.create("grp1"),
        label: "旧ラベル",
        layout: [],
      },
    ];

    const enriched = enrichLayoutWithFields(layout, fields);
    const group = enriched[0];
    expect(group.type).toBe("GROUP");
    if (group.type === "GROUP") {
      expect(group.label).toBe("基本情報");
      expect(group.noLabel).toBe(true);
      expect(group.openGroup).toBe(false);
    }
  });

  it("fieldsにGROUPの定義が見つからない場合、レイアウトの情報がそのまま使われる", () => {
    const fields = new Map<FieldCode, FieldDefinition>();
    const layout: FormLayout = [
      {
        type: "GROUP",
        code: FieldCode.create("grp_orphan"),
        label: "元ラベル",
        layout: [],
      },
    ];

    const enriched = enrichLayoutWithFields(layout, fields);
    const group = enriched[0];
    if (group.type === "GROUP") {
      expect(group.label).toBe("元ラベル");
      expect(group.openGroup).toBeUndefined();
    }
  });

  it("SUBTABLE定義にnoLabelがある場合、enriched結果にnoLabelが反映される", () => {
    const inner = textField("item", "品目", { required: true });
    const sub: SubtableFieldDefinition = {
      code: FieldCode.create("items"),
      type: "SUBTABLE",
      label: "明細",
      noLabel: true,
      properties: { fields: new Map([[FieldCode.create("item"), inner]]) },
    };
    const fields = new Map<FieldCode, FieldDefinition>([
      [FieldCode.create("items"), sub],
    ]);
    const layout: FormLayout = [
      {
        type: "SUBTABLE",
        code: FieldCode.create("items"),
        label: "旧ラベル",
        fields: [{ kind: "field", field: textField("item", "品目") }],
      },
    ];

    const enriched = enrichLayoutWithFields(layout, fields);
    const subtable = enriched[0];
    if (subtable.type === "SUBTABLE") {
      expect(subtable.label).toBe("明細");
      expect(subtable.noLabel).toBe(true);
      const el = subtable.fields[0];
      if (el.kind === "field") {
        expect(el.field).toEqual(inner);
      }
    }
  });

  it("fieldsにSUBTABLEの定義が見つからない場合、レイアウトの情報がそのまま使われる", () => {
    const fields = new Map<FieldCode, FieldDefinition>();
    const orphanInner = textField("item", "品目");
    const layout: FormLayout = [
      {
        type: "SUBTABLE",
        code: FieldCode.create("orphan_table"),
        label: "孤児テーブル",
        fields: [{ kind: "field", field: orphanInner }],
      },
    ];

    const enriched = enrichLayoutWithFields(layout, fields);
    const subtable = enriched[0];
    if (subtable.type === "SUBTABLE") {
      expect(subtable.label).toBe("孤児テーブル");
      // fieldsにないのでフィールド補完はされない
      const el = subtable.fields[0];
      if (el.kind === "field") {
        expect(el.field).toEqual(orphanInner);
      }
    }
  });

  it("REFERENCE_TABLEのlabel/noLabelがfieldsから補完される", () => {
    const refDef: FieldDefinition = {
      code: FieldCode.create("ref"),
      type: "REFERENCE_TABLE",
      label: "関連レコード一覧",
      noLabel: true,
      properties: {
        referenceTable: {
          relatedApp: { app: "5" },
          condition: {
            field: FieldCode.create("key"),
            relatedField: FieldCode.create("rKey"),
          },
          displayFields: [FieldCode.create("col1")],
        },
      },
    } as FieldDefinition;
    const fields = new Map<FieldCode, FieldDefinition>([
      [FieldCode.create("ref"), refDef],
    ]);
    const layout: FormLayout = [
      {
        type: "REFERENCE_TABLE",
        code: FieldCode.create("ref"),
        label: "旧ラベル",
      },
    ];

    const enriched = enrichLayoutWithFields(layout, fields);
    const item = enriched[0];
    expect(item.type).toBe("REFERENCE_TABLE");
    if (item.type === "REFERENCE_TABLE") {
      expect(item.label).toBe("関連レコード一覧");
      expect(item.noLabel).toBe(true);
    }
  });

  it("fieldsにREFERENCE_TABLEの定義が見つからない場合、レイアウトの情報がそのまま使われる", () => {
    const fields = new Map<FieldCode, FieldDefinition>();
    const layout: FormLayout = [
      {
        type: "REFERENCE_TABLE",
        code: FieldCode.create("orphan_ref"),
        label: "孤児参照",
      },
    ];

    const enriched = enrichLayoutWithFields(layout, fields);
    const item = enriched[0];
    if (item.type === "REFERENCE_TABLE") {
      expect(item.label).toBe("孤児参照");
    }
  });

  it("sizeなしのフィールド要素はsize属性を持たない", () => {
    const fullField = textField("name", "名前");
    const fields = new Map<FieldCode, FieldDefinition>([
      [FieldCode.create("name"), fullField],
    ]);
    const layout: FormLayout = [
      {
        type: "ROW",
        fields: [{ kind: "field", field: textField("name", "名前") }],
      },
    ];

    const enriched = enrichLayoutWithFields(layout, fields);
    const row = enriched[0] as LayoutRow;
    const element = row.fields[0];
    if (element.kind === "field") {
      expect(element.size).toBeUndefined();
    }
  });
});

// --- collectSubtableInnerFieldCodes ---

describe("collectSubtableInnerFieldCodes", () => {
  it("サブテーブル内のフィールドコードを収集する", () => {
    const sub = subtableField(
      "items",
      "明細",
      new Map([
        [FieldCode.create("item_name"), textField("item_name", "品名")],
        [FieldCode.create("item_price"), numberField("item_price", "単価")],
      ]),
    );
    const fields = new Map<FieldCode, FieldDefinition>([
      [FieldCode.create("items"), sub],
      [FieldCode.create("memo"), textField("memo", "メモ")],
    ]);

    const innerCodes = collectSubtableInnerFieldCodes(fields);
    expect(innerCodes.size).toBe(2);
    expect(innerCodes.has(FieldCode.create("item_name"))).toBe(true);
    expect(innerCodes.has(FieldCode.create("item_price"))).toBe(true);
    expect(innerCodes.has(FieldCode.create("memo"))).toBe(false);
    expect(innerCodes.has(FieldCode.create("items"))).toBe(false);
  });

  it("サブテーブルが無い場合は空セットを返す", () => {
    const fields = new Map<FieldCode, FieldDefinition>([
      [FieldCode.create("name"), textField("name", "名前")],
    ]);
    const innerCodes = collectSubtableInnerFieldCodes(fields);
    expect(innerCodes.size).toBe(0);
  });

  it("複数サブテーブルの内部フィールドを全て収集する", () => {
    const sub1 = subtableField(
      "items",
      "明細1",
      new Map([[FieldCode.create("a"), textField("a", "A")]]),
    );
    const sub2 = subtableField(
      "details",
      "明細2",
      new Map([[FieldCode.create("b"), textField("b", "B")]]),
    );
    const fields = new Map<FieldCode, FieldDefinition>([
      [FieldCode.create("items"), sub1],
      [FieldCode.create("details"), sub2],
    ]);

    const innerCodes = collectSubtableInnerFieldCodes(fields);
    expect(innerCodes.size).toBe(2);
    expect(innerCodes.has(FieldCode.create("a"))).toBe(true);
    expect(innerCodes.has(FieldCode.create("b"))).toBe(true);
  });
});
