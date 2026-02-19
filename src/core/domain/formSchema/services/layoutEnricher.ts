import type { FormLayout, LayoutItem, LayoutRow } from "../entity";
import type { FieldCode, FieldDefinition, LayoutElement } from "../valueObject";

function enrichLayoutElement(
  element: LayoutElement,
  fields: ReadonlyMap<FieldCode, FieldDefinition>,
): LayoutElement {
  if (element.kind !== "field") return element;
  const fullField = fields.get(element.field.code);
  if (fullField === undefined) return element;
  return {
    kind: "field",
    field: fullField,
    ...(element.size !== undefined ? { size: element.size } : {}),
  };
}

function enrichLayoutRow(
  row: LayoutRow,
  fields: ReadonlyMap<FieldCode, FieldDefinition>,
): LayoutRow {
  return {
    type: "ROW",
    fields: row.fields.map((e) => enrichLayoutElement(e, fields)),
  };
}

function enrichLayoutItem(
  item: LayoutItem,
  fields: ReadonlyMap<FieldCode, FieldDefinition>,
): LayoutItem {
  switch (item.type) {
    case "ROW":
      return enrichLayoutRow(item, fields);
    case "GROUP": {
      const groupDef = fields.get(item.code);
      return {
        ...item,
        ...(groupDef !== undefined ? { label: groupDef.label } : {}),
        ...(groupDef !== undefined && groupDef.noLabel !== undefined
          ? { noLabel: groupDef.noLabel }
          : {}),
        ...(groupDef !== undefined &&
        groupDef.type === "GROUP" &&
        groupDef.properties.openGroup !== undefined
          ? { openGroup: groupDef.properties.openGroup }
          : {}),
        layout: item.layout.map((r) => enrichLayoutRow(r, fields)),
      };
    }
    case "SUBTABLE": {
      const subtableDef = fields.get(item.code);
      const subFieldsMap: ReadonlyMap<FieldCode, FieldDefinition> =
        subtableDef !== undefined && subtableDef.type === "SUBTABLE"
          ? subtableDef.properties.fields
          : new Map();
      return {
        ...item,
        ...(subtableDef !== undefined ? { label: subtableDef.label } : {}),
        ...(subtableDef !== undefined && subtableDef.noLabel !== undefined
          ? { noLabel: subtableDef.noLabel }
          : {}),
        fields: item.fields.map((e) => enrichLayoutElement(e, subFieldsMap)),
      };
    }
  }
}

export function enrichLayoutWithFields(
  layout: FormLayout,
  fields: ReadonlyMap<FieldCode, FieldDefinition>,
): FormLayout {
  return layout.map((item) => enrichLayoutItem(item, fields));
}

export function collectSubtableInnerFieldCodes(
  fields: ReadonlyMap<FieldCode, FieldDefinition>,
): ReadonlySet<FieldCode> {
  const innerCodes = new Set<FieldCode>();
  for (const def of fields.values()) {
    if (def.type === "SUBTABLE") {
      for (const subCode of def.properties.fields.keys()) {
        innerCodes.add(subCode);
      }
    }
  }
  return innerCodes;
}
