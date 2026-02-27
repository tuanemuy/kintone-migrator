import { describe, expect, it } from "vitest";
import type { FormLayout } from "../../entity";
import type {
  FieldCode,
  FieldDefinition,
  LayoutElement,
} from "../../valueObject";
import { SchemaParser } from "../schemaParser";
import { SchemaSerializer } from "../schemaSerializer";

function makeField(
  code: string,
  type: FieldDefinition["type"] = "SINGLE_LINE_TEXT",
  label = code,
  properties: Record<string, unknown> = {},
): FieldDefinition {
  return {
    code: code as FieldCode,
    type,
    label,
    properties,
  } as FieldDefinition;
}

describe("SchemaSerializer", () => {
  describe("serialize", () => {
    it("ROW レイアウトをシリアライズできる", () => {
      const field = makeField("name", "SINGLE_LINE_TEXT", "名前", {
        required: true,
      });
      const layout: FormLayout = [
        {
          type: "ROW",
          fields: [{ kind: "field", field, size: { width: "200" } }],
        },
      ];
      const yaml = SchemaSerializer.serialize(layout);
      expect(yaml).toContain("type: ROW");
      expect(yaml).toContain("code: name");
      expect(yaml).toContain("type: SINGLE_LINE_TEXT");
      expect(yaml).toContain("label: 名前");
      expect(yaml).toContain("required: true");
      expect(yaml).toContain('width: "200"');
    });

    it("GROUP レイアウトをシリアライズできる", () => {
      const field = makeField("inner", "SINGLE_LINE_TEXT", "内部");
      const layout: FormLayout = [
        {
          type: "GROUP",
          code: "grp" as FieldCode,
          label: "グループ",
          openGroup: true,
          layout: [{ type: "ROW", fields: [{ kind: "field", field }] }],
        },
      ];
      const yaml = SchemaSerializer.serialize(layout);
      expect(yaml).toContain("type: GROUP");
      expect(yaml).toContain("code: grp");
      expect(yaml).toContain("openGroup: true");
    });

    it("SUBTABLE レイアウトをシリアライズできる", () => {
      const field = makeField("col1", "NUMBER", "列1");
      const layout: FormLayout = [
        {
          type: "SUBTABLE",
          code: "tbl" as FieldCode,
          label: "テーブル",
          fields: [{ kind: "field", field }],
        },
      ];
      const yaml = SchemaSerializer.serialize(layout);
      expect(yaml).toContain("type: SUBTABLE");
      expect(yaml).toContain("code: tbl");
      expect(yaml).toContain("code: col1");
    });

    it("REFERENCE_TABLE レイアウトアイテムを fields 付きでシリアライズできる", () => {
      const refField: FieldDefinition = {
        code: "ref" as FieldCode,
        type: "REFERENCE_TABLE",
        label: "参照",
        properties: {
          referenceTable: {
            relatedApp: { app: "5" },
            condition: {
              field: "key" as FieldCode,
              relatedField: "rKey" as FieldCode,
            },
            displayFields: ["c1" as FieldCode, "c2" as FieldCode],
            filterCond: 'x = "1"',
            sort: "c1 asc",
          },
        },
      };
      const fields = new Map<FieldCode, FieldDefinition>([
        ["ref" as FieldCode, refField],
      ]);
      const layout: FormLayout = [
        {
          type: "REFERENCE_TABLE",
          code: "ref" as FieldCode,
          label: "参照",
        },
      ];
      const yaml = SchemaSerializer.serialize(layout, fields);
      expect(yaml).toContain("type: REFERENCE_TABLE");
      expect(yaml).toContain("code: ref");
      expect(yaml).toContain('app: "5"');
      expect(yaml).toContain("field: key");
      expect(yaml).toContain("relatedField: rKey");
    });

    it("REFERENCE_TABLE レイアウトアイテムを fields なしでシリアライズすると基本プロパティのみ出力される", () => {
      const layout: FormLayout = [
        {
          type: "REFERENCE_TABLE",
          code: "ref" as FieldCode,
          label: "参照",
          noLabel: true,
        },
      ];
      const yaml = SchemaSerializer.serialize(layout);
      expect(yaml).toContain("type: REFERENCE_TABLE");
      expect(yaml).toContain("code: ref");
      expect(yaml).toContain("label: 参照");
      expect(yaml).toContain("noLabel: true");
    });

    it("デコレーション要素をシリアライズできる", () => {
      const elements: LayoutElement[] = [
        {
          kind: "decoration",
          type: "LABEL",
          label: "ラベル",
          elementId: "el1",
          size: { width: "200" },
        },
        { kind: "decoration", type: "SPACER", elementId: "el2", size: {} },
        {
          kind: "decoration",
          type: "HR",
          elementId: "el3",
          size: { width: "400" },
        },
      ];
      const layout: FormLayout = [{ type: "ROW", fields: elements }];
      const yaml = SchemaSerializer.serialize(layout);
      expect(yaml).toContain("type: LABEL");
      expect(yaml).toContain("elementId: el1");
      expect(yaml).toContain("type: SPACER");
      expect(yaml).toContain("elementId: el2");
      expect(yaml).toContain("type: HR");
      expect(yaml).toContain("elementId: el3");
    });

    it("システムフィールドをシリアライズできる", () => {
      const elements: LayoutElement[] = [
        { kind: "systemField", code: "RECORD_NUMBER", type: "RECORD_NUMBER" },
        {
          kind: "systemField",
          code: "CREATOR",
          type: "CREATOR",
          size: { width: "100" },
        },
      ];
      const layout: FormLayout = [{ type: "ROW", fields: elements }];
      const yaml = SchemaSerializer.serialize(layout);
      expect(yaml).toContain("code: RECORD_NUMBER");
      expect(yaml).toContain("code: CREATOR");
    });

    it("REFERENCE_TABLE をシリアライズできる", () => {
      const field: FieldDefinition = {
        code: "ref" as FieldCode,
        type: "REFERENCE_TABLE",
        label: "参照",
        properties: {
          referenceTable: {
            relatedApp: { app: "5" },
            condition: {
              field: "key" as FieldCode,
              relatedField: "rKey" as FieldCode,
            },
            displayFields: ["c1" as FieldCode, "c2" as FieldCode],
            filterCond: 'x = "1"',
            sort: "c1 asc",
          },
        },
      };
      const layout: FormLayout = [
        { type: "ROW", fields: [{ kind: "field", field }] },
      ];
      const yaml = SchemaSerializer.serialize(layout);
      expect(yaml).toContain("type: REFERENCE_TABLE");
      expect(yaml).toContain('app: "5"');
      expect(yaml).toContain("field: key");
      expect(yaml).toContain("relatedField: rKey");
    });

    it("noLabel付きフィールドをシリアライズするとnoLabelが出力される", () => {
      const field: FieldDefinition = {
        code: "hidden" as FieldCode,
        type: "SINGLE_LINE_TEXT",
        label: "非表示ラベル",
        noLabel: true,
        properties: { required: true },
      } as FieldDefinition;
      const layout: FormLayout = [
        { type: "ROW", fields: [{ kind: "field", field }] },
      ];
      const yaml = SchemaSerializer.serialize(layout);
      expect(yaml).toContain("noLabel: true");
      expect(yaml).toContain("code: hidden");
    });

    it("GROUP の noLabel をシリアライズできる", () => {
      const field = makeField("inner", "SINGLE_LINE_TEXT", "内部");
      const layout: FormLayout = [
        {
          type: "GROUP",
          code: "grp" as FieldCode,
          label: "グループ",
          noLabel: true,
          openGroup: false,
          layout: [{ type: "ROW", fields: [{ kind: "field", field }] }],
        },
      ];
      const yaml = SchemaSerializer.serialize(layout);
      expect(yaml).toContain("noLabel: true");
      expect(yaml).toContain("openGroup: false");
    });

    it("SUBTABLE の noLabel をシリアライズできる", () => {
      const field = makeField("col1", "NUMBER", "列1");
      const layout: FormLayout = [
        {
          type: "SUBTABLE",
          code: "tbl" as FieldCode,
          label: "テーブル",
          noLabel: true,
          fields: [{ kind: "field", field }],
        },
      ];
      const yaml = SchemaSerializer.serialize(layout);
      expect(yaml).toContain("noLabel: true");
      expect(yaml).toContain("type: SUBTABLE");
    });

    it("空レイアウトをシリアライズすると空のlayout配列が出力される", () => {
      const yaml = SchemaSerializer.serialize([]);
      expect(yaml).toContain("layout:");
    });

    it("size の height と innerHeight をシリアライズできる", () => {
      const field = makeField("memo", "MULTI_LINE_TEXT", "メモ");
      const layout: FormLayout = [
        {
          type: "ROW",
          fields: [
            {
              kind: "field",
              field,
              size: { width: "500", height: "200", innerHeight: "150" },
            },
          ],
        },
      ];
      const yaml = SchemaSerializer.serialize(layout);
      expect(yaml).toContain('width: "500"');
      expect(yaml).toContain('height: "200"');
      expect(yaml).toContain('innerHeight: "150"');
    });

    it("GROUP 型のフィールドはプロパティをフラット化せずレイアウト構造のみ出力する", () => {
      const innerField = makeField("inner", "SINGLE_LINE_TEXT", "内部");
      const layout: FormLayout = [
        {
          type: "GROUP",
          code: "grp" as FieldCode,
          label: "グループ",
          layout: [
            { type: "ROW", fields: [{ kind: "field", field: innerField }] },
          ],
        },
      ];
      const yaml = SchemaSerializer.serialize(layout);
      expect(yaml).toContain("type: GROUP");
      expect(yaml).toContain("code: grp");
      expect(yaml).toContain("code: inner");
      // GROUP の properties (openGroup等) はフラット化されない
      expect(yaml).not.toContain("properties");
    });

    it("REFERENCE_TABLE の size 付きフィールドをシリアライズできる", () => {
      const field: FieldDefinition = {
        code: "ref" as FieldCode,
        type: "REFERENCE_TABLE",
        label: "参照",
        properties: {
          referenceTable: {
            relatedApp: { app: "5" },
            condition: {
              field: "key" as FieldCode,
              relatedField: "rKey" as FieldCode,
            },
            displayFields: ["c1" as FieldCode],
            size: "10",
          },
        },
      };
      const layout: FormLayout = [
        { type: "ROW", fields: [{ kind: "field", field }] },
      ];
      const yaml = SchemaSerializer.serialize(layout);
      expect(yaml).toContain('size: "10"');
    });

    it("デコレーション要素の size が undefined の場合、size が出力されない", () => {
      const elements: LayoutElement[] = [
        {
          kind: "decoration",
          type: "SPACER",
          elementId: "el1",
          size: undefined as unknown as Record<string, string>,
        },
      ];
      const layout: FormLayout = [{ type: "ROW", fields: elements }];
      const yaml = SchemaSerializer.serialize(layout);
      expect(yaml).toContain("type: SPACER");
      expect(yaml).toContain("elementId: el1");
    });

    it("size のない LayoutField をシリアライズすると size が出力されない", () => {
      const field = makeField("name", "SINGLE_LINE_TEXT", "名前");
      const layout: FormLayout = [
        { type: "ROW", fields: [{ kind: "field", field }] },
      ];
      const yaml = SchemaSerializer.serialize(layout);
      expect(yaml).toContain("code: name");
      expect(yaml).not.toContain("size:");
    });
  });

  describe("ラウンドトリップ", () => {
    it("parse → serialize → parse で等価なスキーマを返す", () => {
      const yaml = `
layout:
  - type: ROW
    fields:
      - code: name
        type: SINGLE_LINE_TEXT
        label: 名前
        required: true
      - type: LABEL
        label: セクション
        elementId: el1
        size:
          width: "200"
      - code: RECORD_NUMBER
        type: RECORD_NUMBER
  - type: GROUP
    code: grp
    label: グループ
    openGroup: true
    layout:
      - type: ROW
        fields:
          - code: inner
            type: NUMBER
            label: 内部数値
  - type: SUBTABLE
    code: tbl
    label: テーブル
    fields:
      - code: col1
        type: SINGLE_LINE_TEXT
        label: 列1
`;
      const schema1 = SchemaParser.parse(yaml);
      const serialized = SchemaSerializer.serialize(schema1.layout);
      const schema2 = SchemaParser.parse(serialized);

      expect(schema2.fields.size).toBe(schema1.fields.size);
      for (const [code, def1] of schema1.fields) {
        const def2 = schema2.fields.get(code);
        expect(def2).toBeDefined();
        expect(def2?.type).toBe(def1.type);
        expect(def2?.label).toBe(def1.label);
      }
      expect(schema2.layout.length).toBe(schema1.layout.length);
    });

    it("REFERENCE_TABLE のラウンドトリップ", () => {
      const yaml = `
layout:
  - type: ROW
    fields:
      - code: ref
        type: REFERENCE_TABLE
        label: 参照
        referenceTable:
          relatedApp:
            app: "10"
          condition:
            field: key
            relatedField: rKey
          displayFields:
            - col1
          sort: col1 asc
`;
      const schema1 = SchemaParser.parse(yaml);
      const serialized = SchemaSerializer.serialize(schema1.layout);
      const schema2 = SchemaParser.parse(serialized);

      const ref1 = schema1.fields.get("ref" as FieldCode);
      const ref2 = schema2.fields.get("ref" as FieldCode);
      expect(ref1?.type).toBe("REFERENCE_TABLE");
      expect(ref2?.type).toBe("REFERENCE_TABLE");
      if (
        ref1?.type === "REFERENCE_TABLE" &&
        ref2?.type === "REFERENCE_TABLE"
      ) {
        expect(ref2.properties.referenceTable.relatedApp.app).toBe(
          ref1.properties.referenceTable.relatedApp.app,
        );
        expect(
          ref2.properties.referenceTable.displayFields.map(String),
        ).toEqual(ref1.properties.referenceTable.displayFields.map(String));
      }
    });

    it("REFERENCE_TABLE の filterCond, sort, size を含むラウンドトリップ", () => {
      const yaml = `
layout:
  - type: ROW
    fields:
      - code: ref
        type: REFERENCE_TABLE
        label: 参照
        referenceTable:
          relatedApp:
            app: "42"
          condition:
            field: customer_id
            relatedField: id
          displayFields:
            - name
            - email
          filterCond: 'status = "active"'
          sort: name asc
          size: "10"
`;
      const schema1 = SchemaParser.parse(yaml);
      const serialized = SchemaSerializer.serialize(schema1.layout);
      const schema2 = SchemaParser.parse(serialized);

      const ref1 = schema1.fields.get("ref" as FieldCode);
      const ref2 = schema2.fields.get("ref" as FieldCode);
      expect(ref1?.type).toBe("REFERENCE_TABLE");
      expect(ref2?.type).toBe("REFERENCE_TABLE");
      if (
        ref1?.type === "REFERENCE_TABLE" &&
        ref2?.type === "REFERENCE_TABLE"
      ) {
        const rt1 = ref1.properties.referenceTable;
        const rt2 = ref2.properties.referenceTable;
        expect(rt2.filterCond).toBe(rt1.filterCond);
        expect(rt2.sort).toBe(rt1.sort);
        expect(rt2.size).toBe(rt1.size);
        expect(rt2.displayFields.map(String)).toEqual(
          rt1.displayFields.map(String),
        );
        expect(String(rt2.condition.field)).toBe(String(rt1.condition.field));
        expect(String(rt2.condition.relatedField)).toBe(
          String(rt1.condition.relatedField),
        );
      }
    });

    it("REFERENCE_TABLE レイアウトアイテムのラウンドトリップ", () => {
      const yaml = `
layout:
  - type: REFERENCE_TABLE
    code: ref
    label: 参照
    referenceTable:
      relatedApp:
        app: "10"
      condition:
        field: key
        relatedField: rKey
      displayFields:
        - col1
      sort: col1 asc
`;
      const schema1 = SchemaParser.parse(yaml);
      const serialized = SchemaSerializer.serialize(
        schema1.layout,
        schema1.fields,
      );
      const schema2 = SchemaParser.parse(serialized);

      expect(schema2.layout.length).toBe(schema1.layout.length);
      expect(schema2.layout[0].type).toBe("REFERENCE_TABLE");

      const ref1 = schema1.fields.get("ref" as FieldCode);
      const ref2 = schema2.fields.get("ref" as FieldCode);
      expect(ref1?.type).toBe("REFERENCE_TABLE");
      expect(ref2?.type).toBe("REFERENCE_TABLE");
      if (
        ref1?.type === "REFERENCE_TABLE" &&
        ref2?.type === "REFERENCE_TABLE"
      ) {
        expect(ref2.properties.referenceTable.relatedApp.app).toBe(
          ref1.properties.referenceTable.relatedApp.app,
        );
        expect(
          ref2.properties.referenceTable.displayFields.map(String),
        ).toEqual(ref1.properties.referenceTable.displayFields.map(String));
        expect(ref2.properties.referenceTable.sort).toBe(
          ref1.properties.referenceTable.sort,
        );
      }
    });

    it("全フィールドタイプの複合ラウンドトリップ", () => {
      const yaml = `
layout:
  - type: ROW
    fields:
      - code: text
        type: SINGLE_LINE_TEXT
        label: テキスト
        required: true
      - code: num
        type: NUMBER
        label: 数値
        unit: 円
        unitPosition: AFTER
      - code: calc
        type: CALC
        label: 計算
        expression: num * 2
        format: NUMBER
      - code: cb
        type: CHECK_BOX
        label: チェックボックス
        options:
          A: { label: A, index: "0" }
          B: { label: B, index: "1" }
  - type: GROUP
    code: grp
    label: グループ
    openGroup: true
    layout:
      - type: ROW
        fields:
          - code: date
            type: DATE
            label: 日付
  - type: SUBTABLE
    code: tbl
    label: テーブル
    fields:
      - code: col1
        type: SINGLE_LINE_TEXT
        label: 列1
      - code: col2
        type: NUMBER
        label: 列2
  - type: REFERENCE_TABLE
    code: ref
    label: 参照テーブル
    referenceTable:
      relatedApp:
        app: "42"
      condition:
        field: customer_id
        relatedField: id
      displayFields:
        - name
        - email
`;
      const schema1 = SchemaParser.parse(yaml);
      const serialized = SchemaSerializer.serialize(
        schema1.layout,
        schema1.fields,
      );
      const schema2 = SchemaParser.parse(serialized);

      expect(schema2.fields.size).toBe(schema1.fields.size);
      for (const [code, def1] of schema1.fields) {
        const def2 = schema2.fields.get(code);
        expect(def2).toBeDefined();
        expect(def2?.type).toBe(def1.type);
        expect(def2?.label).toBe(def1.label);
      }
    });
  });
});
