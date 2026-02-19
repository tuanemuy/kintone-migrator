import { describe, expect, it } from "vitest";
import type { DiffEntry, FormLayout, Schema } from "../../entity";
import type {
  FieldCode,
  FieldDefinition,
  ReferenceTableFieldDefinition,
  SubtableFieldDefinition,
} from "../../valueObject";
import { DiffDetector } from "../diffDetector";

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

function makeSubtableField(
  code: string,
  label: string,
  innerFields: ReadonlyMap<FieldCode, FieldDefinition>,
): SubtableFieldDefinition {
  return {
    code: code as FieldCode,
    type: "SUBTABLE",
    label,
    properties: { fields: innerFields },
  };
}

function makeReferenceTableField(
  code: string,
  label: string,
  overrides: Partial<
    ReferenceTableFieldDefinition["properties"]["referenceTable"]
  > = {},
): ReferenceTableFieldDefinition {
  return {
    code: code as FieldCode,
    type: "REFERENCE_TABLE",
    label,
    properties: {
      referenceTable: {
        relatedApp: { app: "1" },
        condition: {
          field: "key" as FieldCode,
          relatedField: "rKey" as FieldCode,
        },
        displayFields: ["col1" as FieldCode],
        ...overrides,
      },
    },
  };
}

function makeSchema(
  fieldsArray: FieldDefinition[],
  layout: FormLayout = [],
): Schema {
  const fields = new Map<FieldCode, FieldDefinition>();
  for (const f of fieldsArray) {
    fields.set(f.code, f);
  }
  return { fields, layout };
}

function makeFieldMap(
  fieldsArray: FieldDefinition[],
): ReadonlyMap<FieldCode, FieldDefinition> {
  const map = new Map<FieldCode, FieldDefinition>();
  for (const f of fieldsArray) {
    map.set(f.code, f);
  }
  return map;
}

describe("DiffDetector", () => {
  describe("detect", () => {
    it("差異がない場合、空の diff を返す", () => {
      const field = makeField("name");
      const schema = makeSchema([field]);
      const current = makeFieldMap([field]);

      const diff = DiffDetector.detect(schema, current);
      expect(diff.isEmpty).toBe(true);
      expect(diff.entries).toHaveLength(0);
      expect(diff.summary.total).toBe(0);
    });

    it("追加されたフィールドを検出する", () => {
      const field = makeField("name");
      const schema = makeSchema([field]);
      const current = makeFieldMap([]);

      const diff = DiffDetector.detect(schema, current);
      expect(diff.isEmpty).toBe(false);
      expect(diff.summary.added).toBe(1);
      expect(diff.entries[0].type).toBe("added");
      expect(String(diff.entries[0].fieldCode)).toBe("name");
    });

    it("削除されたフィールドを検出する", () => {
      const field = makeField("old");
      const schema = makeSchema([]);
      const current = makeFieldMap([field]);

      const diff = DiffDetector.detect(schema, current);
      expect(diff.summary.deleted).toBe(1);
      expect(diff.entries[0].type).toBe("deleted");
    });

    it("変更されたフィールドを検出する (type 変更)", () => {
      const before = makeField("f", "SINGLE_LINE_TEXT");
      const after = makeField("f", "NUMBER");
      const schema = makeSchema([after]);
      const current = makeFieldMap([before]);

      const diff = DiffDetector.detect(schema, current);
      expect(diff.summary.modified).toBe(1);
      expect(diff.entries[0].details).toContain("type:");
    });

    it("変更されたフィールドを検出する (label 変更)", () => {
      const before = makeField("f", "SINGLE_LINE_TEXT", "old label");
      const after = makeField("f", "SINGLE_LINE_TEXT", "new label");
      const schema = makeSchema([after]);
      const current = makeFieldMap([before]);

      const diff = DiffDetector.detect(schema, current);
      expect(diff.summary.modified).toBe(1);
      expect(diff.entries[0].details).toContain("label:");
    });

    it("変更されたフィールドを検出する (properties 変更)", () => {
      const before = makeField("f", "SINGLE_LINE_TEXT", "f", {
        required: false,
      });
      const after = makeField("f", "SINGLE_LINE_TEXT", "f", {
        required: true,
      });
      const schema = makeSchema([after]);
      const current = makeFieldMap([before]);

      const diff = DiffDetector.detect(schema, current);
      expect(diff.summary.modified).toBe(1);
      expect(diff.entries[0].details).toContain("properties changed");
    });

    it("noLabel が変更された場合、変更として検出する", () => {
      const before: FieldDefinition = {
        code: "f" as FieldCode,
        type: "SINGLE_LINE_TEXT",
        label: "f",
        properties: {},
      } as FieldDefinition;
      const after: FieldDefinition = {
        code: "f" as FieldCode,
        type: "SINGLE_LINE_TEXT",
        label: "f",
        noLabel: true,
        properties: {},
      } as FieldDefinition;
      const schema = makeSchema([after]);
      const current = makeFieldMap([before]);

      const diff = DiffDetector.detect(schema, current);
      expect(diff.summary.modified).toBe(1);
      expect(diff.entries[0].details).toContain("noLabel:");
    });

    it("SUBTABLE 内部フィールドが変更された場合、テーブルの変更として検出する", () => {
      const innerBefore = makeField("col1", "SINGLE_LINE_TEXT", "列1");
      const innerAfter = makeField("col1", "SINGLE_LINE_TEXT", "列1_改");
      const before = makeSubtableField(
        "tbl",
        "テーブル",
        new Map([["col1" as FieldCode, innerBefore]]),
      );
      const after = makeSubtableField(
        "tbl",
        "テーブル",
        new Map([["col1" as FieldCode, innerAfter]]),
      );
      const schema = makeSchema([after]);
      const current = makeFieldMap([before]);

      const diff = DiffDetector.detect(schema, current);
      expect(diff.summary.modified).toBe(1);
      expect(diff.entries[0].details).toContain("properties changed");
    });

    it("SUBTABLE 内部フィールドが同一の場合、差分なしとなる", () => {
      const inner = makeField("col1", "SINGLE_LINE_TEXT", "列1");
      const sub = makeSubtableField(
        "tbl",
        "テーブル",
        new Map([["col1" as FieldCode, inner]]),
      );
      const schema = makeSchema([sub]);
      const current = makeFieldMap([sub]);

      const diff = DiffDetector.detect(schema, current);
      expect(diff.isEmpty).toBe(true);
    });

    it("SUBTABLE 内部フィールドの数が変わった場合、テーブルの変更として検出する", () => {
      const inner1 = makeField("col1", "SINGLE_LINE_TEXT", "列1");
      const inner2 = makeField("col2", "NUMBER", "列2");
      const before = makeSubtableField(
        "tbl",
        "テーブル",
        new Map([["col1" as FieldCode, inner1]]),
      );
      const after = makeSubtableField(
        "tbl",
        "テーブル",
        new Map([
          ["col1" as FieldCode, inner1],
          ["col2" as FieldCode, inner2],
        ]),
      );
      const schema = makeSchema([after]);
      const current = makeFieldMap([before]);

      const diff = DiffDetector.detect(schema, current);
      expect(diff.summary.modified).toBe(1);
    });

    it("REFERENCE_TABLE の displayFields が変更された場合、変更として検出する", () => {
      const before = makeReferenceTableField("ref", "参照", {
        displayFields: ["col1" as FieldCode],
      });
      const after = makeReferenceTableField("ref", "参照", {
        displayFields: ["col1" as FieldCode, "col2" as FieldCode],
      });
      const schema = makeSchema([after]);
      const current = makeFieldMap([before]);

      const diff = DiffDetector.detect(schema, current);
      expect(diff.summary.modified).toBe(1);
      expect(diff.entries[0].details).toContain("properties changed");
    });

    it("REFERENCE_TABLE の relatedApp が変更された場合、変更として検出する", () => {
      const before = makeReferenceTableField("ref", "参照", {
        relatedApp: { app: "1" },
      });
      const after = makeReferenceTableField("ref", "参照", {
        relatedApp: { app: "2" },
      });
      const schema = makeSchema([after]);
      const current = makeFieldMap([before]);

      const diff = DiffDetector.detect(schema, current);
      expect(diff.summary.modified).toBe(1);
    });

    it("REFERENCE_TABLE が同一の場合、差分なしとなる", () => {
      const ref = makeReferenceTableField("ref", "参照");
      const schema = makeSchema([ref]);
      const current = makeFieldMap([ref]);

      const diff = DiffDetector.detect(schema, current);
      expect(diff.isEmpty).toBe(true);
    });

    it("複合変更を正しく集計する", () => {
      const unchanged = makeField("keep");
      const deleted = makeField("old");
      const added = makeField("new");
      const modifiedBefore = makeField("mod", "SINGLE_LINE_TEXT", "before");
      const modifiedAfter = makeField("mod", "SINGLE_LINE_TEXT", "after");

      const schema = makeSchema([unchanged, added, modifiedAfter]);
      const current = makeFieldMap([unchanged, deleted, modifiedBefore]);

      const diff = DiffDetector.detect(schema, current);
      expect(diff.summary.added).toBe(1);
      expect(diff.summary.modified).toBe(1);
      expect(diff.summary.deleted).toBe(1);
      expect(diff.summary.total).toBe(3);
    });

    it("エントリがソートされる (added → modified → deleted)", () => {
      const deleted = makeField("del");
      const added = makeField("add");
      const modBefore = makeField("mod", "SINGLE_LINE_TEXT", "a");
      const modAfter = makeField("mod", "SINGLE_LINE_TEXT", "b");

      const schema = makeSchema([added, modAfter]);
      const current = makeFieldMap([deleted, modBefore]);

      const diff = DiffDetector.detect(schema, current);
      const types = diff.entries.map((e: DiffEntry) => e.type);
      expect(types).toEqual(["added", "modified", "deleted"]);
    });

    it("addedエントリは before を持たず after のフィールド定義を持つ", () => {
      const field = makeField("new_field", "NUMBER", "新規");
      const schema = makeSchema([field]);
      const current = makeFieldMap([]);

      const diff = DiffDetector.detect(schema, current);
      expect(diff.entries[0].before).toBeUndefined();
      expect(diff.entries[0].after).toEqual(field);
      expect(diff.entries[0].details).toBe("new field");
    });

    it("deletedエントリは before のフィールド定義を持ち after を持たない", () => {
      const field = makeField("old_field", "NUMBER", "旧");
      const schema = makeSchema([]);
      const current = makeFieldMap([field]);

      const diff = DiffDetector.detect(schema, current);
      expect(diff.entries[0].before).toEqual(field);
      expect(diff.entries[0].after).toBeUndefined();
      expect(diff.entries[0].details).toBe("deleted");
    });

    it("modifiedエントリは before と after の両方を持つ", () => {
      const before = makeField("f", "SINGLE_LINE_TEXT", "旧ラベル");
      const after = makeField("f", "SINGLE_LINE_TEXT", "新ラベル");
      const schema = makeSchema([after]);
      const current = makeFieldMap([before]);

      const diff = DiffDetector.detect(schema, current);
      expect(diff.entries[0].before).toEqual(before);
      expect(diff.entries[0].after).toEqual(after);
    });

    it("type と label が同時に変更された場合、両方の変更内容を details に含む", () => {
      const before = makeField("f", "SINGLE_LINE_TEXT", "旧ラベル");
      const after = makeField("f", "NUMBER", "新ラベル");
      const schema = makeSchema([after]);
      const current = makeFieldMap([before]);

      const diff = DiffDetector.detect(schema, current);
      expect(diff.entries[0].details).toContain("type:");
      expect(diff.entries[0].details).toContain("label:");
    });

    it("全く同一のフィールドは差分として検出されない", () => {
      const field = makeField("f", "SINGLE_LINE_TEXT", "same", {
        required: true,
      });
      const schema = makeSchema([field]);
      const current = makeFieldMap([field]);
      const diff = DiffDetector.detect(schema, current);
      expect(diff.isEmpty).toBe(true);
    });

    it("SUBTABLE のサイズが異なるマップは modified として検出される", () => {
      const inner1 = makeField("col1", "SINGLE_LINE_TEXT", "列1");
      const before = makeSubtableField(
        "tbl",
        "テーブル",
        new Map([["col1" as FieldCode, inner1]]),
      );
      const after = makeSubtableField(
        "tbl",
        "テーブル",
        new Map(), // 空のサブテーブル
      );
      const schema = makeSchema([after]);
      const current = makeFieldMap([before]);

      const diff = DiffDetector.detect(schema, current);
      expect(diff.summary.modified).toBe(1);
    });

    it("SUBTABLE の内部フィールドのキーが異なる場合、modified として検出される", () => {
      const inner1 = makeField("col1", "SINGLE_LINE_TEXT", "列1");
      const inner2 = makeField("col2", "SINGLE_LINE_TEXT", "列2");
      const before = makeSubtableField(
        "tbl",
        "テーブル",
        new Map([["col1" as FieldCode, inner1]]),
      );
      const after = makeSubtableField(
        "tbl",
        "テーブル",
        new Map([["col2" as FieldCode, inner2]]),
      );
      const schema = makeSchema([after]);
      const current = makeFieldMap([before]);

      const diff = DiffDetector.detect(schema, current);
      expect(diff.summary.modified).toBe(1);
    });

    it("REFERENCE_TABLE の filterCond が変更された場合、modified として検出される", () => {
      const before = makeReferenceTableField("ref", "参照", {
        filterCond: 'status = "active"',
      });
      const after = makeReferenceTableField("ref", "参照", {
        filterCond: 'status = "inactive"',
      });
      const schema = makeSchema([after]);
      const current = makeFieldMap([before]);

      const diff = DiffDetector.detect(schema, current);
      expect(diff.summary.modified).toBe(1);
    });

    it("REFERENCE_TABLE の sort が変更された場合、modified として検出される", () => {
      const before = makeReferenceTableField("ref", "参照", {
        sort: "col1 asc",
      });
      const after = makeReferenceTableField("ref", "参照", {
        sort: "col1 desc",
      });
      const schema = makeSchema([after]);
      const current = makeFieldMap([before]);

      const diff = DiffDetector.detect(schema, current);
      expect(diff.summary.modified).toBe(1);
      expect(diff.entries[0].details).toContain("properties changed");
    });

    it("REFERENCE_TABLE の condition が変更された場合、modified として検出される", () => {
      const before = makeReferenceTableField("ref", "参照", {
        condition: {
          field: "key" as FieldCode,
          relatedField: "rKey" as FieldCode,
        },
      });
      const after = makeReferenceTableField("ref", "参照", {
        condition: {
          field: "newKey" as FieldCode,
          relatedField: "rKey" as FieldCode,
        },
      });
      const schema = makeSchema([after]);
      const current = makeFieldMap([before]);

      const diff = DiffDetector.detect(schema, current);
      expect(diff.summary.modified).toBe(1);
    });

    it("RADIO_BUTTON の defaultValue 文字列が異なる場合、modified として検出される", () => {
      const before = makeField("f", "RADIO_BUTTON", "RB", {
        defaultValue: "A",
        options: {
          A: { label: "A", index: "0" },
          B: { label: "B", index: "1" },
        },
      });
      const after = makeField("f", "RADIO_BUTTON", "RB", {
        defaultValue: "B",
        options: {
          A: { label: "A", index: "0" },
          B: { label: "B", index: "1" },
        },
      });
      const schema = makeSchema([after]);
      const current = makeFieldMap([before]);

      const diff = DiffDetector.detect(schema, current);
      expect(diff.summary.modified).toBe(1);
    });

    it("RADIO_BUTTON の defaultValue が同一文字列の場合、差分なしとなる", () => {
      const field = makeField("f", "RADIO_BUTTON", "RB", {
        defaultValue: "A",
        options: { A: { label: "A", index: "0" } },
      });
      const schema = makeSchema([field]);
      const current = makeFieldMap([field]);

      const diff = DiffDetector.detect(schema, current);
      expect(diff.isEmpty).toBe(true);
    });

    it("配列プロパティが異なる長さの場合、modified として検出される", () => {
      const before = makeField("f", "CHECK_BOX", "CB", {
        defaultValue: ["A"],
      });
      const after = makeField("f", "CHECK_BOX", "CB", {
        defaultValue: ["A", "B"],
      });
      const schema = makeSchema([after]);
      const current = makeFieldMap([before]);

      const diff = DiffDetector.detect(schema, current);
      expect(diff.summary.modified).toBe(1);
    });

    it("null と undefined の比較で modified として検出される", () => {
      const before = makeField("f", "SINGLE_LINE_TEXT", "f", {
        defaultValue: null,
      });
      const after = makeField("f", "SINGLE_LINE_TEXT", "f", {
        defaultValue: "test",
      });
      const schema = makeSchema([after]);
      const current = makeFieldMap([before]);

      const diff = DiffDetector.detect(schema, current);
      expect(diff.summary.modified).toBe(1);
    });

    it("異なるプリミティブ型の比較で modified として検出される", () => {
      const before = makeField("f", "SINGLE_LINE_TEXT", "f", {
        required: "true",
      });
      const after = makeField("f", "SINGLE_LINE_TEXT", "f", {
        required: true,
      });
      const schema = makeSchema([after]);
      const current = makeFieldMap([before]);

      const diff = DiffDetector.detect(schema, current);
      expect(diff.summary.modified).toBe(1);
    });

    it("マップキーとフィールドの code が一致しない場合、modified として検出し details は no visible changes になる", () => {
      const before: FieldDefinition = {
        code: "f_old" as FieldCode,
        type: "SINGLE_LINE_TEXT",
        label: "F",
        properties: {},
      } as FieldDefinition;
      const after: FieldDefinition = {
        code: "f_new" as FieldCode,
        type: "SINGLE_LINE_TEXT",
        label: "F",
        properties: {},
      } as FieldDefinition;

      const schemaFields = new Map<FieldCode, FieldDefinition>([
        ["f" as FieldCode, after],
      ]);
      const currentFields = new Map<FieldCode, FieldDefinition>([
        ["f" as FieldCode, before],
      ]);
      const schema: Schema = { fields: schemaFields, layout: [] };

      const diff = DiffDetector.detect(schema, currentFields);
      expect(diff.summary.modified).toBe(1);
      expect(diff.entries[0].details).toBe("no visible changes");
    });

    it("noLabel が true から false に変更された場合、details に noLabel の変更を含む", () => {
      const before: FieldDefinition = {
        code: "f" as FieldCode,
        type: "SINGLE_LINE_TEXT",
        label: "f",
        noLabel: true,
        properties: {},
      } as FieldDefinition;
      const after: FieldDefinition = {
        code: "f" as FieldCode,
        type: "SINGLE_LINE_TEXT",
        label: "f",
        noLabel: false,
        properties: {},
      } as FieldDefinition;
      const schema = makeSchema([after]);
      const current = makeFieldMap([before]);

      const diff = DiffDetector.detect(schema, current);
      expect(diff.summary.modified).toBe(1);
      expect(diff.entries[0].details).toContain("noLabel: true -> false");
    });

    it("オブジェクトプロパティのキー数が異なる場合、modified として検出される", () => {
      const before = makeField("f", "SINGLE_LINE_TEXT", "f", {
        required: true,
      });
      const after = makeField("f", "SINGLE_LINE_TEXT", "f", {
        required: true,
        unique: true,
      });
      const schema = makeSchema([after]);
      const current = makeFieldMap([before]);

      const diff = DiffDetector.detect(schema, current);
      expect(diff.summary.modified).toBe(1);
    });

    it("プロパティのキー名が異なる場合、modified として検出される", () => {
      const before = makeField("f", "SINGLE_LINE_TEXT", "f", {
        required: true,
      });
      const after = makeField("f", "SINGLE_LINE_TEXT", "f", {
        unique: true,
      });
      const schema = makeSchema([after]);
      const current = makeFieldMap([before]);

      const diff = DiffDetector.detect(schema, current);
      expect(diff.summary.modified).toBe(1);
      expect(diff.entries[0].details).toContain("properties changed");
    });
  });

  describe("detectLayoutChanges", () => {
    it("同一レイアウトで false を返す", () => {
      const layout: FormLayout = [{ type: "ROW", fields: [] }];
      expect(DiffDetector.detectLayoutChanges(layout, layout)).toBe(false);
    });

    it("異なるレイアウトで true を返す", () => {
      const a: FormLayout = [{ type: "ROW", fields: [] }];
      const b: FormLayout = [];
      expect(DiffDetector.detectLayoutChanges(a, b)).toBe(true);
    });

    it("フィールド内容が異なる場合 true を返す", () => {
      const fieldA = makeField("a", "SINGLE_LINE_TEXT", "A");
      const fieldB = makeField("a", "SINGLE_LINE_TEXT", "B");
      const a: FormLayout = [
        { type: "ROW", fields: [{ kind: "field", field: fieldA }] },
      ];
      const b: FormLayout = [
        { type: "ROW", fields: [{ kind: "field", field: fieldB }] },
      ];
      expect(DiffDetector.detectLayoutChanges(a, b)).toBe(true);
    });

    it("両方とも空レイアウトの場合 false を返す", () => {
      expect(DiffDetector.detectLayoutChanges([], [])).toBe(false);
    });

    it("GROUP レイアウトの内部構造が異なる場合 true を返す", () => {
      const fieldA = makeField("inner", "SINGLE_LINE_TEXT", "A");
      const fieldB = makeField("inner", "SINGLE_LINE_TEXT", "B");
      const a: FormLayout = [
        {
          type: "GROUP",
          code: "grp" as FieldCode,
          label: "グループ",
          layout: [{ type: "ROW", fields: [{ kind: "field", field: fieldA }] }],
        },
      ];
      const b: FormLayout = [
        {
          type: "GROUP",
          code: "grp" as FieldCode,
          label: "グループ",
          layout: [{ type: "ROW", fields: [{ kind: "field", field: fieldB }] }],
        },
      ];
      expect(DiffDetector.detectLayoutChanges(a, b)).toBe(true);
    });
  });
});
