import { describe, expect, it } from "vitest";
import type {
  FieldCode,
  FieldDefinition,
  SubtableFieldDefinition,
} from "../../valueObject";
import { FieldCode as FC } from "../../valueObject";
import { splitSubtableInnerFields } from "../subtableFieldSplitter";

function makeSubtable(
  code: string,
  fields: ReadonlyMap<FieldCode, FieldDefinition>,
): SubtableFieldDefinition {
  return {
    code: FC.create(code),
    type: "SUBTABLE",
    label: code,
    properties: { fields },
  };
}

function textField(code: string): FieldDefinition {
  return {
    code: FC.create(code),
    type: "SINGLE_LINE_TEXT",
    label: code,
    properties: {},
  } as FieldDefinition;
}

describe("splitSubtableInnerFields", () => {
  it("全フィールドが新規の場合、newInnerFieldsに全て入る", () => {
    const desired = makeSubtable(
      "table",
      new Map([
        [FC.create("a"), textField("a")],
        [FC.create("b"), textField("b")],
      ]),
    );
    const current = makeSubtable("table", new Map());

    const result = splitSubtableInnerFields(desired, current);

    expect(result.newInnerFields.size).toBe(2);
    expect(result.existingInnerFields.size).toBe(0);
    expect(result.newInnerFields.has(FC.create("a"))).toBe(true);
    expect(result.newInnerFields.has(FC.create("b"))).toBe(true);
  });

  it("全フィールドが既存の場合、existingInnerFieldsに全て入る", () => {
    const desired = makeSubtable(
      "table",
      new Map([
        [FC.create("a"), textField("a")],
        [FC.create("b"), textField("b")],
      ]),
    );
    const current = makeSubtable(
      "table",
      new Map([
        [FC.create("a"), textField("a")],
        [FC.create("b"), textField("b")],
      ]),
    );

    const result = splitSubtableInnerFields(desired, current);

    expect(result.newInnerFields.size).toBe(0);
    expect(result.existingInnerFields.size).toBe(2);
  });

  it("新規と既存が混在する場合、正しく分割される", () => {
    const desired = makeSubtable(
      "table",
      new Map([
        [FC.create("existing"), textField("existing")],
        [FC.create("new_field"), textField("new_field")],
      ]),
    );
    const current = makeSubtable(
      "table",
      new Map([[FC.create("existing"), textField("existing")]]),
    );

    const result = splitSubtableInnerFields(desired, current);

    expect(result.newInnerFields.size).toBe(1);
    expect(result.existingInnerFields.size).toBe(1);
    expect(result.newInnerFields.has(FC.create("new_field"))).toBe(true);
    expect(result.existingInnerFields.has(FC.create("existing"))).toBe(true);
  });

  it("desiredが空の場合、両方とも空になる", () => {
    const desired = makeSubtable("table", new Map());
    const current = makeSubtable(
      "table",
      new Map([[FC.create("a"), textField("a")]]),
    );

    const result = splitSubtableInnerFields(desired, current);

    expect(result.newInnerFields.size).toBe(0);
    expect(result.existingInnerFields.size).toBe(0);
  });
});
