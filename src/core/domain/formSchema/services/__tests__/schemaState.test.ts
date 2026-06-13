import { describe, expect, it } from "vitest";
import { BusinessRuleError } from "@/core/domain/error";
import type { Schema } from "../../entity";
import { SchemaParser } from "../schemaParser";
import { SchemaStateParser } from "../schemaStateParser";
import { SchemaStateSerializer } from "../schemaStateSerializer";

// A realistic captured-form object (the shape SchemaParser consumes).
const realisticForm = {
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
        { code: "qty", type: "NUMBER", label: "数量" },
      ],
    },
    {
      type: "GROUP",
      code: "grp1",
      label: "基本情報",
      openGroup: true,
      layout: [
        {
          type: "ROW",
          fields: [{ code: "memo", type: "MULTI_LINE_TEXT", label: "メモ" }],
        },
      ],
    },
    {
      type: "SUBTABLE",
      code: "items",
      label: "明細",
      fields: [
        { code: "item_name", type: "SINGLE_LINE_TEXT", label: "品名" },
        { code: "item_qty", type: "NUMBER", label: "個数" },
      ],
    },
    {
      type: "REFERENCE_TABLE",
      code: "ref",
      label: "参照",
      referenceTable: {
        relatedApp: { app: "123" },
        condition: { field: "name", relatedField: "rel" },
        displayFields: ["item_name"],
      },
    },
    {
      type: "ROW",
      fields: [
        { type: "LABEL", label: "区切り", elementId: "e1", size: {} },
        { type: "SPACER", elementId: "e2", size: {} },
        { type: "HR", elementId: "e3", size: {} },
      ],
    },
  ],
};

describe("SchemaState serialize/parse", () => {
  it("snapshot のみを round-trip できる（revision は state に含めない）", () => {
    const schema: Schema = SchemaParser.parse(realisticForm);
    const serialized = SchemaStateSerializer.serialize({ schema });
    // revision is now stored separately; the state file must not carry it
    // anymore.
    expect(serialized.revision).toBeUndefined();

    const parsed = SchemaStateParser.parse(serialized);

    // serialize -> parse -> serialize is a fixed point.
    const reserialized = SchemaStateSerializer.serialize(parsed);
    expect(reserialized).toEqual(serialized);
  });

  it("field/subtable/group/reference-table/decoration を含む snapshot を保持する", () => {
    const schema = SchemaParser.parse(realisticForm);
    const parsed = SchemaStateParser.parse(
      SchemaStateSerializer.serialize({ schema }),
    );
    expect(parsed.schema.layout).toEqual(schema.layout);
  });

  it("旧 state（revision 同居）から後方互換で読める（revision は無視される）", () => {
    // Legacy state files embedded a top-level `revision` alongside the layout.
    // The parser must strip and ignore it for backward compatibility.
    const schema = SchemaParser.parse(realisticForm);
    const data = SchemaStateSerializer.serialize({ schema });
    const legacy = { revision: "42", ...data };

    const parsed = SchemaStateParser.parse(legacy);

    expect(parsed.schema.layout).toEqual(schema.layout);
    // No revision leaks back out; the migrated snapshot drops it.
    expect(SchemaStateSerializer.serialize(parsed).revision).toBeUndefined();
  });

  it("非オブジェクトは BusinessRuleError をスローする", () => {
    expect(() => SchemaStateParser.parse("not an object")).toThrow(
      BusinessRuleError,
    );
  });

  it("空フォーム（最低1フィールド制約）は round-trip できない", () => {
    // A layout with no fields cannot satisfy Schema.create's minimum-1-field
    // constraint, so parsing it back throws.
    const emptyData = { layout: [] };
    expect(() => SchemaStateParser.parse(emptyData)).toThrow(BusinessRuleError);
  });
});
