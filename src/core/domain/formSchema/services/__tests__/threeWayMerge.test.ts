import { describe, expect, it } from "vitest";
import type { Schema } from "../../entity";
import { FieldCode, type MergeResolution } from "../../valueObject";
import { SchemaParser } from "../schemaParser";
import {
  computeThreeWayMerge,
  normalizeForThreeWay,
  resolveMerge,
} from "../threeWayMerge";

function fieldRow(
  code: string,
  type = "SINGLE_LINE_TEXT",
  label = code,
  extra: Record<string, unknown> = {},
): Record<string, unknown> {
  return { type, code, label, ...extra };
}

function schemaOf(rows: Record<string, unknown>[][]): Schema {
  return SchemaParser.parse({
    layout: rows.map((fields) => ({ type: "ROW", fields })),
  });
}

const base = schemaOf([[fieldRow("name", "SINGLE_LINE_TEXT", "名前")]]);

describe("normalizeForThreeWay", () => {
  it("GROUP と subtable inner を field チャネルから除外する", () => {
    const schema = SchemaParser.parse({
      layout: [
        {
          type: "GROUP",
          code: "grp",
          label: "G",
          layout: [
            {
              type: "ROW",
              fields: [fieldRow("inner", "SINGLE_LINE_TEXT", "内部")],
            },
          ],
        },
        {
          type: "SUBTABLE",
          code: "items",
          label: "明細",
          fields: [fieldRow("col", "SINGLE_LINE_TEXT", "列")],
        },
      ],
    });
    const normalized = normalizeForThreeWay(schema.fields);
    // grp (GROUP definition) and col (subtable inner) are excluded.
    expect(normalized.has(FieldCode.create("grp"))).toBe(false);
    expect(normalized.has(FieldCode.create("col"))).toBe(false);
    // Group inner fields are ordinary top-level fields (present in remote too).
    expect(normalized.has(FieldCode.create("inner"))).toBe(true);
    // The subtable itself remains as a single entity.
    expect(normalized.has(FieldCode.create("items"))).toBe(true);
  });
});

describe("computeThreeWayMerge", () => {
  it("片側のみのフィールド変更は自動マージされ conflict にならない", () => {
    const local = schemaOf([[fieldRow("name", "SINGLE_LINE_TEXT", "名前_新")]]);
    const remote = base;
    const merge = computeThreeWayMerge(base, local, remote);
    expect(merge.hasConflict).toBe(false);
    const entry = merge.fieldEntries.find(
      (e) => e.key === FieldCode.create("name"),
    );
    expect(entry?.change.kind).toBe("localOnly");
  });

  it("両側が同一フィールドを別の値に変更すると conflict になる", () => {
    const local = schemaOf([[fieldRow("name", "SINGLE_LINE_TEXT", "L")]]);
    const remote = schemaOf([[fieldRow("name", "SINGLE_LINE_TEXT", "R")]]);
    const merge = computeThreeWayMerge(base, local, remote);
    expect(merge.hasConflict).toBe(true);
    expect(merge.fieldConflicts).toHaveLength(1);
  });

  it("GROUP は field チャネルで remote 削除と誤検出されない", () => {
    // base/local have a GROUP; remote (getFields-like) lacks GROUP definitions.
    const withGroup = SchemaParser.parse({
      layout: [
        { type: "ROW", fields: [fieldRow("name", "SINGLE_LINE_TEXT", "名前")] },
        {
          type: "GROUP",
          code: "grp",
          label: "G",
          layout: [
            {
              type: "ROW",
              fields: [fieldRow("inner", "SINGLE_LINE_TEXT", "内部")],
            },
          ],
        },
      ],
    });
    const merge = computeThreeWayMerge(withGroup, withGroup, withGroup);
    // grp must not appear as a field-channel entry at all.
    expect(
      merge.fieldEntries.some((e) => e.key === FieldCode.create("grp")),
    ).toBe(false);
    expect(merge.hasConflict).toBe(false);
  });

  it("subtable はサブテーブル丸ごと1エンティティとして扱う", () => {
    const withSub = SchemaParser.parse({
      layout: [
        {
          type: "SUBTABLE",
          code: "items",
          label: "明細",
          fields: [fieldRow("col1", "SINGLE_LINE_TEXT", "列1")],
        },
      ],
    });
    const merge = computeThreeWayMerge(withSub, withSub, withSub);
    const subtableEntries = merge.fieldEntries.filter(
      (e) => e.key === FieldCode.create("items"),
    );
    expect(subtableEntries).toHaveLength(1);
    // inner col1 is not a separate field-channel entry.
    expect(
      merge.fieldEntries.some((e) => e.key === FieldCode.create("col1")),
    ).toBe(false);
  });

  it("両側 layout 変更で同一なら layout conflict にならない", () => {
    const local = schemaOf([
      [fieldRow("name", "SINGLE_LINE_TEXT", "名前")],
      [fieldRow("extra", "SINGLE_LINE_TEXT", "追加")],
    ]);
    const merge = computeThreeWayMerge(base, local, local);
    expect(merge.layoutConflict).toBe(false);
  });

  it("両側 layout を別々に変更すると layout conflict になる", () => {
    const local = schemaOf([
      [fieldRow("name", "SINGLE_LINE_TEXT", "名前")],
      [fieldRow("la", "SINGLE_LINE_TEXT", "ローカル追加")],
    ]);
    const remote = schemaOf([
      [fieldRow("name", "SINGLE_LINE_TEXT", "名前")],
      [fieldRow("ra", "SINGLE_LINE_TEXT", "リモート追加")],
    ]);
    const merge = computeThreeWayMerge(base, local, remote);
    expect(merge.layoutConflict).toBe(true);
    expect(merge.hasConflict).toBe(true);
  });
});

describe("resolveMerge", () => {
  it("field conflict を local 採用で解決する", () => {
    const local = schemaOf([[fieldRow("name", "SINGLE_LINE_TEXT", "L")]]);
    const remote = schemaOf([[fieldRow("name", "SINGLE_LINE_TEXT", "R")]]);
    const merge = computeThreeWayMerge(base, local, remote);
    const resolution: MergeResolution = {
      fields: new Map([[FieldCode.create("name"), "local"]]),
      layout: "local",
    };
    const merged = resolveMerge(merge, resolution);
    expect(merged.fields.get(FieldCode.create("name"))?.label).toBe("L");
  });

  it("field conflict を remote 採用で解決する", () => {
    const local = schemaOf([[fieldRow("name", "SINGLE_LINE_TEXT", "L")]]);
    const remote = schemaOf([[fieldRow("name", "SINGLE_LINE_TEXT", "R")]]);
    const merge = computeThreeWayMerge(base, local, remote);
    const resolution: MergeResolution = {
      fields: new Map([[FieldCode.create("name"), "remote"]]),
      layout: "remote",
    };
    const merged = resolveMerge(merge, resolution);
    expect(merged.fields.get(FieldCode.create("name"))?.label).toBe("R");
  });

  it("conflict 未網羅の resolution はエラーになる", () => {
    const local = schemaOf([[fieldRow("name", "SINGLE_LINE_TEXT", "L")]]);
    const remote = schemaOf([[fieldRow("name", "SINGLE_LINE_TEXT", "R")]]);
    const merge = computeThreeWayMerge(base, local, remote);
    const resolution: MergeResolution = {
      fields: new Map(),
      layout: "local",
    };
    expect(() => resolveMerge(merge, resolution)).toThrow();
  });

  it("layout conflict で side 未指定はエラーになる", () => {
    const local = schemaOf([
      [fieldRow("name", "SINGLE_LINE_TEXT", "名前")],
      [fieldRow("la", "SINGLE_LINE_TEXT", "ローカル")],
    ]);
    const remote = schemaOf([
      [fieldRow("name", "SINGLE_LINE_TEXT", "名前")],
      [fieldRow("ra", "SINGLE_LINE_TEXT", "リモート")],
    ]);
    const merge = computeThreeWayMerge(base, local, remote);
    const resolution: MergeResolution = {
      fields: new Map(),
      layout: "noConflict",
    };
    expect(() => resolveMerge(merge, resolution)).toThrow();
  });

  it("conflict がない自動マージを再構成できる", () => {
    const local = schemaOf([[fieldRow("name", "SINGLE_LINE_TEXT", "名前_新")]]);
    const merge = computeThreeWayMerge(base, local, base);
    const merged = resolveMerge(merge, {
      fields: new Map(),
      layout: "noConflict",
    });
    expect(merged.fields.get(FieldCode.create("name"))?.label).toBe("名前_新");
  });
});
