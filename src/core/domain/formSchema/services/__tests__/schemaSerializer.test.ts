import { describe, expect, it } from "vitest";
import type { FormLayout } from "../../entity";
import {
  FieldCode,
  type FieldDefinition,
  type LayoutElement,
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
    code: FieldCode.create(code),
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
      const result = SchemaSerializer.serialize(layout);
      expect(result).toEqual({
        layout: [
          {
            type: "ROW",
            fields: [
              {
                code: "name",
                type: "SINGLE_LINE_TEXT",
                label: "名前",
                required: true,
                size: { width: "200" },
              },
            ],
          },
        ],
      });
    });

    it("GROUP レイアウトをシリアライズできる", () => {
      const field = makeField("inner", "SINGLE_LINE_TEXT", "内部");
      const layout: FormLayout = [
        {
          type: "GROUP",
          code: FieldCode.create("grp"),
          label: "グループ",
          openGroup: true,
          layout: [{ type: "ROW", fields: [{ kind: "field", field }] }],
        },
      ];
      const result = SchemaSerializer.serialize(layout);
      const groupItem = result.layout as Record<string, unknown>[];
      expect(groupItem[0].type).toBe("GROUP");
      expect(groupItem[0].code).toBe("grp");
      expect(groupItem[0].openGroup).toBe(true);
    });

    it("SUBTABLE レイアウトをシリアライズできる", () => {
      const field = makeField("col1", "NUMBER", "列1");
      const layout: FormLayout = [
        {
          type: "SUBTABLE",
          code: FieldCode.create("tbl"),
          label: "テーブル",
          fields: [{ kind: "field", field }],
        },
      ];
      const result = SchemaSerializer.serialize(layout);
      const subtableItem = (result.layout as Record<string, unknown>[])[0];
      expect(subtableItem.type).toBe("SUBTABLE");
      expect(subtableItem.code).toBe("tbl");
      const fields = subtableItem.fields as Record<string, unknown>[];
      expect(fields[0].code).toBe("col1");
    });

    it("REFERENCE_TABLE レイアウトアイテムを fields 付きでシリアライズできる", () => {
      const refField: FieldDefinition = {
        code: FieldCode.create("ref"),
        type: "REFERENCE_TABLE",
        label: "参照",
        properties: {
          referenceTable: {
            relatedApp: { app: "5" },
            condition: {
              field: FieldCode.create("key"),
              relatedField: FieldCode.create("rKey"),
            },
            displayFields: [FieldCode.create("c1"), FieldCode.create("c2")],
            filterCond: 'x = "1"',
            sort: "c1 asc",
          },
        },
      };
      const fields = new Map<FieldCode, FieldDefinition>([
        [FieldCode.create("ref"), refField],
      ]);
      const layout: FormLayout = [
        {
          type: "REFERENCE_TABLE",
          code: FieldCode.create("ref"),
          label: "参照",
        },
      ];
      const result = SchemaSerializer.serialize(layout, fields);
      const refItem = (result.layout as Record<string, unknown>[])[0];
      expect(refItem.type).toBe("REFERENCE_TABLE");
      expect(refItem.code).toBe("ref");
      const refTable = refItem.referenceTable as Record<string, unknown>;
      const relatedApp = refTable.relatedApp as Record<string, unknown>;
      expect(relatedApp.app).toBe("5");
      const condition = refTable.condition as Record<string, unknown>;
      expect(condition.field).toBe("key");
      expect(condition.relatedField).toBe("rKey");
    });

    it("REFERENCE_TABLE レイアウトアイテムを fields なしでシリアライズすると基本プロパティのみ出力される", () => {
      const layout: FormLayout = [
        {
          type: "REFERENCE_TABLE",
          code: FieldCode.create("ref"),
          label: "参照",
          noLabel: true,
        },
      ];
      const result = SchemaSerializer.serialize(layout);
      const refItem = (result.layout as Record<string, unknown>[])[0];
      expect(refItem.type).toBe("REFERENCE_TABLE");
      expect(refItem.code).toBe("ref");
      expect(refItem.label).toBe("参照");
      expect(refItem.noLabel).toBe(true);
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
      const result = SchemaSerializer.serialize(layout);
      const fields = (
        (result.layout as Record<string, unknown>[])[0] as Record<
          string,
          unknown
        >
      ).fields as Record<string, unknown>[];
      expect(fields[0].type).toBe("LABEL");
      expect(fields[0].elementId).toBe("el1");
      expect(fields[1].type).toBe("SPACER");
      expect(fields[1].elementId).toBe("el2");
      expect(fields[2].type).toBe("HR");
      expect(fields[2].elementId).toBe("el3");
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
      const result = SchemaSerializer.serialize(layout);
      const fields = (
        (result.layout as Record<string, unknown>[])[0] as Record<
          string,
          unknown
        >
      ).fields as Record<string, unknown>[];
      expect(fields[0].code).toBe("RECORD_NUMBER");
      expect(fields[1].code).toBe("CREATOR");
    });

    it("REFERENCE_TABLE をシリアライズできる", () => {
      const field: FieldDefinition = {
        code: FieldCode.create("ref"),
        type: "REFERENCE_TABLE",
        label: "参照",
        properties: {
          referenceTable: {
            relatedApp: { app: "5" },
            condition: {
              field: FieldCode.create("key"),
              relatedField: FieldCode.create("rKey"),
            },
            displayFields: [FieldCode.create("c1"), FieldCode.create("c2")],
            filterCond: 'x = "1"',
            sort: "c1 asc",
          },
        },
      };
      const layout: FormLayout = [
        { type: "ROW", fields: [{ kind: "field", field }] },
      ];
      const result = SchemaSerializer.serialize(layout);
      const rowFields = (
        (result.layout as Record<string, unknown>[])[0] as Record<
          string,
          unknown
        >
      ).fields as Record<string, unknown>[];
      expect(rowFields[0].type).toBe("REFERENCE_TABLE");
      const refTable = rowFields[0].referenceTable as Record<string, unknown>;
      const relatedApp = refTable.relatedApp as Record<string, unknown>;
      expect(relatedApp.app).toBe("5");
      const condition = refTable.condition as Record<string, unknown>;
      expect(condition.field).toBe("key");
      expect(condition.relatedField).toBe("rKey");
    });

    it("noLabel付きフィールドをシリアライズするとnoLabelが出力される", () => {
      const field: FieldDefinition = {
        code: FieldCode.create("hidden"),
        type: "SINGLE_LINE_TEXT",
        label: "非表示ラベル",
        noLabel: true,
        properties: { required: true },
      } as FieldDefinition;
      const layout: FormLayout = [
        { type: "ROW", fields: [{ kind: "field", field }] },
      ];
      const result = SchemaSerializer.serialize(layout);
      const rowFields = (
        (result.layout as Record<string, unknown>[])[0] as Record<
          string,
          unknown
        >
      ).fields as Record<string, unknown>[];
      expect(rowFields[0].noLabel).toBe(true);
      expect(rowFields[0].code).toBe("hidden");
    });

    it("GROUP の noLabel をシリアライズできる", () => {
      const field = makeField("inner", "SINGLE_LINE_TEXT", "内部");
      const layout: FormLayout = [
        {
          type: "GROUP",
          code: FieldCode.create("grp"),
          label: "グループ",
          noLabel: true,
          openGroup: false,
          layout: [{ type: "ROW", fields: [{ kind: "field", field }] }],
        },
      ];
      const result = SchemaSerializer.serialize(layout);
      const groupItem = (result.layout as Record<string, unknown>[])[0];
      expect(groupItem.noLabel).toBe(true);
      expect(groupItem.openGroup).toBe(false);
    });

    it("SUBTABLE の noLabel をシリアライズできる", () => {
      const field = makeField("col1", "NUMBER", "列1");
      const layout: FormLayout = [
        {
          type: "SUBTABLE",
          code: FieldCode.create("tbl"),
          label: "テーブル",
          noLabel: true,
          fields: [{ kind: "field", field }],
        },
      ];
      const result = SchemaSerializer.serialize(layout);
      const subtableItem = (result.layout as Record<string, unknown>[])[0];
      expect(subtableItem.noLabel).toBe(true);
      expect(subtableItem.type).toBe("SUBTABLE");
    });

    it("空レイアウトをシリアライズすると空のlayout配列が出力される", () => {
      const result = SchemaSerializer.serialize([]);
      expect(result).toEqual({ layout: [] });
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
      const result = SchemaSerializer.serialize(layout);
      const rowFields = (
        (result.layout as Record<string, unknown>[])[0] as Record<
          string,
          unknown
        >
      ).fields as Record<string, unknown>[];
      const size = rowFields[0].size as Record<string, string>;
      expect(size.width).toBe("500");
      expect(size.height).toBe("200");
      expect(size.innerHeight).toBe("150");
    });

    it("GROUP 型のフィールドはプロパティをフラット化せずレイアウト構造のみ出力する", () => {
      const innerField = makeField("inner", "SINGLE_LINE_TEXT", "内部");
      const layout: FormLayout = [
        {
          type: "GROUP",
          code: FieldCode.create("grp"),
          label: "グループ",
          layout: [
            { type: "ROW", fields: [{ kind: "field", field: innerField }] },
          ],
        },
      ];
      const result = SchemaSerializer.serialize(layout);
      const groupItem = (result.layout as Record<string, unknown>[])[0];
      expect(groupItem.type).toBe("GROUP");
      expect(groupItem.code).toBe("grp");
      const innerRow = (groupItem.layout as Record<string, unknown>[])[0];
      const innerFields = innerRow.fields as Record<string, unknown>[];
      expect(innerFields[0].code).toBe("inner");
      // GROUP の properties (openGroup等) はフラット化されない
      expect(JSON.stringify(result)).not.toContain('"properties"');
    });

    it("REFERENCE_TABLE の size 付きフィールドをシリアライズできる", () => {
      const field: FieldDefinition = {
        code: FieldCode.create("ref"),
        type: "REFERENCE_TABLE",
        label: "参照",
        properties: {
          referenceTable: {
            relatedApp: { app: "5" },
            condition: {
              field: FieldCode.create("key"),
              relatedField: FieldCode.create("rKey"),
            },
            displayFields: [FieldCode.create("c1")],
            size: "10",
          },
        },
      };
      const layout: FormLayout = [
        { type: "ROW", fields: [{ kind: "field", field }] },
      ];
      const result = SchemaSerializer.serialize(layout);
      const rowFields = (
        (result.layout as Record<string, unknown>[])[0] as Record<
          string,
          unknown
        >
      ).fields as Record<string, unknown>[];
      const refTable = rowFields[0].referenceTable as Record<string, unknown>;
      expect(refTable.size).toBe("10");
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
      const result = SchemaSerializer.serialize(layout);
      const fields = (
        (result.layout as Record<string, unknown>[])[0] as Record<
          string,
          unknown
        >
      ).fields as Record<string, unknown>[];
      expect(fields[0].type).toBe("SPACER");
      expect(fields[0].elementId).toBe("el1");
    });

    it("size のない LayoutField をシリアライズすると size が出力されない", () => {
      const field = makeField("name", "SINGLE_LINE_TEXT", "名前");
      const layout: FormLayout = [
        { type: "ROW", fields: [{ kind: "field", field }] },
      ];
      const result = SchemaSerializer.serialize(layout);
      const rowFields = (
        (result.layout as Record<string, unknown>[])[0] as Record<
          string,
          unknown
        >
      ).fields as Record<string, unknown>[];
      expect(rowFields[0].code).toBe("name");
      expect(rowFields[0].size).toBeUndefined();
    });
  });

  describe("ラウンドトリップ", () => {
    it("parse → serialize → parse で等価なスキーマを返す", () => {
      const input = {
        layout: [
          {
            type: "ROW",
            fields: [
              {
                code: "name",
                type: "SINGLE_LINE_TEXT",
                label: "名前",
                required: true,
              },
              {
                type: "LABEL",
                label: "セクション",
                elementId: "el1",
                size: { width: "200" },
              },
              { code: "RECORD_NUMBER", type: "RECORD_NUMBER" },
            ],
          },
          {
            type: "GROUP",
            code: "grp",
            label: "グループ",
            openGroup: true,
            layout: [
              {
                type: "ROW",
                fields: [{ code: "inner", type: "NUMBER", label: "内部数値" }],
              },
            ],
          },
          {
            type: "SUBTABLE",
            code: "tbl",
            label: "テーブル",
            fields: [{ code: "col1", type: "SINGLE_LINE_TEXT", label: "列1" }],
          },
        ],
      };
      const schema1 = SchemaParser.parse(input);
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
      const input = {
        layout: [
          {
            type: "ROW",
            fields: [
              {
                code: "ref",
                type: "REFERENCE_TABLE",
                label: "参照",
                referenceTable: {
                  relatedApp: { app: "10" },
                  condition: { field: "key", relatedField: "rKey" },
                  displayFields: ["col1"],
                  sort: "col1 asc",
                },
              },
            ],
          },
        ],
      };
      const schema1 = SchemaParser.parse(input);
      const serialized = SchemaSerializer.serialize(schema1.layout);
      const schema2 = SchemaParser.parse(serialized);

      const ref1 = schema1.fields.get(FieldCode.create("ref"));
      const ref2 = schema2.fields.get(FieldCode.create("ref"));
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
      const input = {
        layout: [
          {
            type: "ROW",
            fields: [
              {
                code: "ref",
                type: "REFERENCE_TABLE",
                label: "参照",
                referenceTable: {
                  relatedApp: { app: "42" },
                  condition: {
                    field: "customer_id",
                    relatedField: "id",
                  },
                  displayFields: ["name", "email"],
                  filterCond: 'status = "active"',
                  sort: "name asc",
                  size: "10",
                },
              },
            ],
          },
        ],
      };
      const schema1 = SchemaParser.parse(input);
      const serialized = SchemaSerializer.serialize(schema1.layout);
      const schema2 = SchemaParser.parse(serialized);

      const ref1 = schema1.fields.get(FieldCode.create("ref"));
      const ref2 = schema2.fields.get(FieldCode.create("ref"));
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
      const input = {
        layout: [
          {
            type: "REFERENCE_TABLE",
            code: "ref",
            label: "参照",
            referenceTable: {
              relatedApp: { app: "10" },
              condition: { field: "key", relatedField: "rKey" },
              displayFields: ["col1"],
              sort: "col1 asc",
            },
          },
        ],
      };
      const schema1 = SchemaParser.parse(input);
      const serialized = SchemaSerializer.serialize(
        schema1.layout,
        schema1.fields,
      );
      const schema2 = SchemaParser.parse(serialized);

      expect(schema2.layout.length).toBe(schema1.layout.length);
      expect(schema2.layout[0].type).toBe("REFERENCE_TABLE");

      const ref1 = schema1.fields.get(FieldCode.create("ref"));
      const ref2 = schema2.fields.get(FieldCode.create("ref"));
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
      const input = {
        layout: [
          {
            type: "ROW",
            fields: [
              {
                code: "text",
                type: "SINGLE_LINE_TEXT",
                label: "テキスト",
                required: true,
              },
              {
                code: "num",
                type: "NUMBER",
                label: "数値",
                unit: "円",
                unitPosition: "AFTER",
              },
              {
                code: "calc",
                type: "CALC",
                label: "計算",
                expression: "num * 2",
                format: "NUMBER",
              },
              {
                code: "cb",
                type: "CHECK_BOX",
                label: "チェックボックス",
                options: {
                  A: { label: "A", index: "0" },
                  B: { label: "B", index: "1" },
                },
              },
            ],
          },
          {
            type: "GROUP",
            code: "grp",
            label: "グループ",
            openGroup: true,
            layout: [
              {
                type: "ROW",
                fields: [{ code: "date", type: "DATE", label: "日付" }],
              },
            ],
          },
          {
            type: "SUBTABLE",
            code: "tbl",
            label: "テーブル",
            fields: [
              { code: "col1", type: "SINGLE_LINE_TEXT", label: "列1" },
              { code: "col2", type: "NUMBER", label: "列2" },
            ],
          },
          {
            type: "REFERENCE_TABLE",
            code: "ref",
            label: "参照テーブル",
            referenceTable: {
              relatedApp: { app: "42" },
              condition: { field: "customer_id", relatedField: "id" },
              displayFields: ["name", "email"],
            },
          },
        ],
      };
      const schema1 = SchemaParser.parse(input);
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
