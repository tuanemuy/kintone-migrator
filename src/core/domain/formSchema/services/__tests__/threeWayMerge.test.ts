import { describe, expect, it } from "vitest";
import { BusinessRuleError } from "../../../error";
import { Schema } from "../../entity";
import { FormSchemaErrorCode } from "../../errorCode";
import {
  FieldCode,
  type FieldDefinition,
  type MergeResolution,
} from "../../valueObject";
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

/**
 * Rebuilds a schema so its field map mimics `getFields()` output: GROUP
 * definitions are removed from the top-level field map (kintone's
 * field-properties API does not return GROUP), while every other field —
 * including the group's inner fields — stays at the top level. The layout is
 * preserved unchanged. This reproduces the real base/local-vs-remote asymmetry
 * that normalizeForThreeWay must absorb (ADR-007).
 */
function asRemoteGetFields(schema: Schema): Schema {
  const fields = new Map<FieldCode, FieldDefinition>();
  for (const [code, def] of schema.fields) {
    if (def.type === "GROUP") continue;
    fields.set(code, def);
  }
  return Schema.create(fields, schema.layout);
}

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

  it("remote だけ GROUP 定義が欠落しても grp が remote 削除と誤検出されない（非対称再現）", () => {
    // base/local carry the GROUP definition in their field map (SchemaParser
    // puts `grp` at the top level). remote mimics getFields(): the GROUP
    // definition is absent but its inner field stays top-level. Without
    // normalization, grp would classify as remoteOnly (a remote deletion) and
    // be reported as drift; normalizeForThreeWay must drop it from all three.
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
    // Sanity: the asymmetry is real — base has the GROUP def, remote does not.
    expect(withGroup.fields.has(FieldCode.create("grp"))).toBe(true);
    const remote = asRemoteGetFields(withGroup);
    expect(remote.fields.has(FieldCode.create("grp"))).toBe(false);

    const merge = computeThreeWayMerge(withGroup, withGroup, remote);

    // grp must not appear as a field-channel entry at all, and must not be
    // reported as a remoteOnly deletion / conflict.
    expect(
      merge.fieldEntries.some((e) => e.key === FieldCode.create("grp")),
    ).toBe(false);
    expect(
      merge.fieldEntries.some(
        (e) => e.change.kind === "remoteOnly" || e.change.kind === "conflict",
      ),
    ).toBe(false);
    expect(merge.hasConflict).toBe(false);
  });

  it("subtable inner の非対称（remote は inner を top-level flatten）でも subtable 単位で一致扱い", () => {
    // base/local: SchemaParser puts the subtable definition plus its inner
    // field `col` at the top level. remote mimics getFields(): same shape. The
    // subtable is compared whole, so no inner field surfaces as a separate
    // (mis-classified) entry, and there is no drift.
    const withSub = SchemaParser.parse({
      layout: [
        {
          type: "SUBTABLE",
          code: "items",
          label: "明細",
          fields: [fieldRow("col", "SINGLE_LINE_TEXT", "列")],
        },
      ],
    });
    const remote = asRemoteGetFields(withSub);

    const merge = computeThreeWayMerge(withSub, withSub, remote);

    expect(
      merge.fieldEntries.some((e) => e.key === FieldCode.create("col")),
    ).toBe(false);
    expect(
      merge.fieldEntries.some(
        (e) => e.change.kind === "remoteOnly" || e.change.kind === "conflict",
      ),
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

  // W-004 (ADR-012): the most complex resolveMerge path — a subtable conflict
  // whose inner construction differs between sides — must reconstruct the
  // chosen side's inner fields as top-level entries (and drop the rejected
  // side's). Fixtures include a GROUP and a subtable so the reconstruction from
  // the chosen layout is genuinely exercised, not just a single SINGLE_LINE.
  describe("GROUP/subtable-inner 再構成", () => {
    const subtableBase = SchemaParser.parse({
      layout: [
        { type: "ROW", fields: [fieldRow("name", "SINGLE_LINE_TEXT", "名前")] },
        {
          type: "GROUP",
          code: "grp",
          label: "G",
          layout: [
            {
              type: "ROW",
              fields: [fieldRow("g_inner", "SINGLE_LINE_TEXT", "G内部")],
            },
          ],
        },
        {
          type: "SUBTABLE",
          code: "items",
          label: "明細",
          fields: [fieldRow("col_a", "SINGLE_LINE_TEXT", "列A")],
        },
      ],
    });

    // local: subtable inner has col_b (renamed/replaced inner construction).
    const subtableLocal = SchemaParser.parse({
      layout: [
        { type: "ROW", fields: [fieldRow("name", "SINGLE_LINE_TEXT", "名前")] },
        {
          type: "GROUP",
          code: "grp",
          label: "G",
          layout: [
            {
              type: "ROW",
              fields: [fieldRow("g_inner", "SINGLE_LINE_TEXT", "G内部")],
            },
          ],
        },
        {
          type: "SUBTABLE",
          code: "items",
          label: "明細",
          fields: [fieldRow("col_b", "SINGLE_LINE_TEXT", "列B")],
        },
      ],
    });

    // remote: subtable inner has col_c (a third, different construction).
    const subtableRemote = SchemaParser.parse({
      layout: [
        { type: "ROW", fields: [fieldRow("name", "SINGLE_LINE_TEXT", "名前")] },
        {
          type: "GROUP",
          code: "grp",
          label: "G",
          layout: [
            {
              type: "ROW",
              fields: [fieldRow("g_inner", "SINGLE_LINE_TEXT", "G内部")],
            },
          ],
        },
        {
          type: "SUBTABLE",
          code: "items",
          label: "明細",
          fields: [fieldRow("col_c", "SINGLE_LINE_TEXT", "列C")],
        },
      ],
    });

    it("subtable conflict を local 採用すると採用側 inner が top-level に展開され他方は落ちる", () => {
      const merge = computeThreeWayMerge(
        subtableBase,
        subtableLocal,
        subtableRemote,
      );
      // The subtable diverged on both sides => conflict over `items`.
      expect(
        merge.fieldConflicts.some((c) => c.key === FieldCode.create("items")),
      ).toBe(true);

      const merged = resolveMerge(merge, {
        fields: new Map([[FieldCode.create("items"), "local"]]),
        layout: "local",
      });

      const subtable = merged.fields.get(FieldCode.create("items"));
      expect(subtable?.type).toBe("SUBTABLE");
      if (subtable?.type === "SUBTABLE") {
        expect(subtable.properties.fields.has(FieldCode.create("col_b"))).toBe(
          true,
        );
        expect(subtable.properties.fields.has(FieldCode.create("col_c"))).toBe(
          false,
        );
      }
      // The chosen inner field is reconstructed at top level...
      expect(merged.fields.has(FieldCode.create("col_b"))).toBe(true);
      // ...and the rejected side's inner field is not present.
      expect(merged.fields.has(FieldCode.create("col_c"))).toBe(false);
      expect(merged.fields.has(FieldCode.create("col_a"))).toBe(false);
      // GROUP inner field stays top-level (reconstructed from the chosen side).
      expect(merged.fields.has(FieldCode.create("g_inner"))).toBe(true);
    });

    it("subtable conflict を remote 採用すると採用側 inner が top-level に展開される", () => {
      const merge = computeThreeWayMerge(
        subtableBase,
        subtableLocal,
        subtableRemote,
      );

      const merged = resolveMerge(merge, {
        fields: new Map([[FieldCode.create("items"), "remote"]]),
        layout: "remote",
      });

      const subtable = merged.fields.get(FieldCode.create("items"));
      expect(subtable?.type).toBe("SUBTABLE");
      if (subtable?.type === "SUBTABLE") {
        expect(subtable.properties.fields.has(FieldCode.create("col_c"))).toBe(
          true,
        );
      }
      expect(merged.fields.has(FieldCode.create("col_c"))).toBe(true);
      expect(merged.fields.has(FieldCode.create("col_b"))).toBe(false);
      expect(merged.fields.has(FieldCode.create("g_inner"))).toBe(true);
    });
  });

  // W-001 (round-2, ADR-016): the field channel and the layout channel are
  // resolved independently. A field added on one side auto-merges into the
  // merged field map, but if the conflicting layout from the *other* side is
  // chosen, that field is not placed anywhere. Layout-driven serialization
  // would silently drop it. resolveMerge must reject this inconsistent
  // resolution instead of producing a schema that loses the adopted field.
  describe("orphan field 検出 (W-001)", () => {
    // base has two ordered fields so local can change the layout (reorder)
    // WITHOUT adding a field. remote adds `rfoo` (auto-merged as remoteOnly
    // into the field channel) and places it in the remote layout. The layouts
    // conflict, so resolveMerge must pick a layout side.
    const orphanBase = schemaOf([
      [fieldRow("name", "SINGLE_LINE_TEXT", "名前")],
      [fieldRow("age", "SINGLE_LINE_TEXT", "年齢")],
    ]);
    // local reorders the two existing fields (layout-only change, no new field).
    const orphanLocal = schemaOf([
      [fieldRow("age", "SINGLE_LINE_TEXT", "年齢")],
      [fieldRow("name", "SINGLE_LINE_TEXT", "名前")],
    ]);
    // remote keeps the original order and appends a new field rfoo.
    const orphanRemote = schemaOf([
      [fieldRow("name", "SINGLE_LINE_TEXT", "名前")],
      [fieldRow("age", "SINGLE_LINE_TEXT", "年齢")],
      [fieldRow("rfoo", "SINGLE_LINE_TEXT", "リモート追加")],
    ]);

    it("追加 field を含む側を採用しつつ layout は含まない側を採用すると拒否される", () => {
      const merge = computeThreeWayMerge(orphanBase, orphanLocal, orphanRemote);
      expect(merge.layoutConflict).toBe(true);
      // rfoo is auto-merged into the field channel (remoteOnly addition).
      expect(
        merge.fieldEntries.some(
          (e) =>
            e.key === FieldCode.create("rfoo") &&
            e.change.kind === "remoteOnly",
        ),
      ).toBe(true);

      // Choosing the local layout (which lacks rfoo) leaves rfoo unplaced.
      expect(() =>
        resolveMerge(merge, {
          fields: new Map(),
          layout: "local",
        }),
      ).toThrow(BusinessRuleError);

      try {
        resolveMerge(merge, { fields: new Map(), layout: "local" });
        expect.unreachable("should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(BusinessRuleError);
        expect((error as BusinessRuleError).code).toBe(
          FormSchemaErrorCode.FsOrphanMergedField,
        );
        expect((error as BusinessRuleError).message).toContain("rfoo");
      }
    });

    it("追加 field を含む側の layout を採用すれば成立し field が保持される", () => {
      const merge = computeThreeWayMerge(orphanBase, orphanLocal, orphanRemote);
      // Choosing the remote layout (which contains rfoo) is consistent: every
      // merged field is placed, so the adopted field is preserved.
      const merged = resolveMerge(merge, {
        fields: new Map(),
        layout: "remote",
      });
      expect(merged.fields.has(FieldCode.create("rfoo"))).toBe(true);
      expect(merged.fields.has(FieldCode.create("name"))).toBe(true);
      expect(merged.fields.has(FieldCode.create("age"))).toBe(true);
    });
  });

  // W-001 (round-3, ADR-017): the mirror of the orphan case. A field DELETED on
  // one side resolves to `undefined` in the field channel and is removed from
  // the merged field map. If the OTHER side's conflicting layout (which still
  // contains the field) is chosen, layout-driven serialization would re-emit
  // the deleted field's full definition from the layout element — silently
  // undoing the deletion. resolveMerge must reject this resurrection.
  describe("resurrected field 検出 (W-001 鏡像)", () => {
    // base has three fields. local deletes `age` (field channel localOnly
    // delete, and the local layout drops the `age` row). remote keeps `age` and
    // makes a separate, field-preserving layout change (reorders name/extra),
    // so the layouts conflict without introducing a new auto-merged field.
    const base = schemaOf([
      [fieldRow("name", "SINGLE_LINE_TEXT", "名前")],
      [fieldRow("age", "SINGLE_LINE_TEXT", "年齢")],
      [fieldRow("extra", "SINGLE_LINE_TEXT", "備考")],
    ]);
    const local = schemaOf([
      [fieldRow("name", "SINGLE_LINE_TEXT", "名前")],
      [fieldRow("extra", "SINGLE_LINE_TEXT", "備考")],
    ]);
    const remote = schemaOf([
      [fieldRow("extra", "SINGLE_LINE_TEXT", "備考")],
      [fieldRow("name", "SINGLE_LINE_TEXT", "名前")],
      [fieldRow("age", "SINGLE_LINE_TEXT", "年齢")],
    ]);

    it("片側で削除した field を含む側の layout を採用すると拒否される", () => {
      const merge = computeThreeWayMerge(base, local, remote);
      expect(merge.layoutConflict).toBe(true);
      // age is auto-merged as a localOnly deletion (merged === undefined).
      const ageEntry = merge.fieldEntries.find(
        (e) => e.key === FieldCode.create("age"),
      );
      expect(ageEntry?.change.kind).toBe("localOnly");
      expect(ageEntry?.merged).toBeUndefined();

      // Choosing the remote layout (which still places age) would resurrect the
      // deleted field via layout-driven serialization.
      expect(() =>
        resolveMerge(merge, {
          fields: new Map(),
          layout: "remote",
        }),
      ).toThrow(BusinessRuleError);

      try {
        resolveMerge(merge, { fields: new Map(), layout: "remote" });
        expect.unreachable("should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(BusinessRuleError);
        expect((error as BusinessRuleError).code).toBe(
          FormSchemaErrorCode.FsOrphanMergedField,
        );
        expect((error as BusinessRuleError).message).toContain("age");
      }
    });

    it("削除を反映する側の layout を採用すれば成立し field が消える", () => {
      const merge = computeThreeWayMerge(base, local, remote);
      // Choosing the local layout (which omits age) is consistent with the
      // deletion: the field is gone and nothing is resurrected.
      const merged = resolveMerge(merge, {
        fields: new Map(),
        layout: "local",
      });
      expect(merged.fields.has(FieldCode.create("age"))).toBe(false);
      expect(merged.fields.has(FieldCode.create("name"))).toBe(true);
      expect(merged.fields.has(FieldCode.create("extra"))).toBe(true);
    });
  });
});
