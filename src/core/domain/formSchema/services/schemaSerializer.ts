import { stringify as stringifyYaml } from "yaml";
import type { FormLayout, LayoutItem, LayoutRow } from "../entity";
import type {
  DecorationElement,
  ElementSize,
  FieldDefinition,
  LayoutElement,
  LayoutField,
  SystemFieldLayout,
} from "../valueObject";

function isLayoutField(element: LayoutElement): element is LayoutField {
  return "field" in element;
}

function isDecorationElement(
  element: LayoutElement,
): element is DecorationElement {
  return "elementId" in element;
}

function isSystemFieldLayout(
  element: LayoutElement,
): element is SystemFieldLayout {
  return !("field" in element) && !("elementId" in element);
}

function serializeSize(size: ElementSize): Record<string, string> {
  const result: Record<string, string> = {};
  if (size.width !== undefined) result.width = size.width;
  if (size.height !== undefined) result.height = size.height;
  if (size.innerHeight !== undefined) result.innerHeight = size.innerHeight;
  return result;
}

function serializeFlatField(
  field: FieldDefinition,
  size?: ElementSize,
): Record<string, unknown> {
  const result: Record<string, unknown> = {
    code: field.code as string,
    type: field.type,
    label: field.label,
  };

  if (field.noLabel !== undefined) {
    result.noLabel = field.noLabel;
  }

  if (size !== undefined) {
    result.size = serializeSize(size);
  }

  if (field.type === "REFERENCE_TABLE") {
    const ref = field.properties.referenceTable;
    result.referenceTable = {
      relatedApp: ref.relatedApp,
      condition: {
        field: ref.condition.field as string,
        relatedField: ref.condition.relatedField as string,
      },
      ...(ref.filterCond !== undefined ? { filterCond: ref.filterCond } : {}),
      displayFields: ref.displayFields.map((f) => f as string),
      ...(ref.sort !== undefined ? { sort: ref.sort } : {}),
      ...(ref.size !== undefined ? { size: ref.size } : {}),
    };
    return result;
  }

  if (field.type !== "SUBTABLE" && field.type !== "GROUP") {
    const properties = field.properties as Record<string, unknown>;
    for (const [key, value] of Object.entries(properties)) {
      result[key] = value;
    }
  }

  return result;
}

function serializeLayoutElement(
  element: LayoutElement,
): Record<string, unknown> {
  if (isLayoutField(element)) {
    return serializeFlatField(element.field, element.size);
  }

  if (isDecorationElement(element)) {
    const dec = element;
    const result: Record<string, unknown> = { type: dec.type };
    if (dec.type === "LABEL") {
      result.label = dec.label;
    }
    result.elementId = dec.elementId;
    if (dec.size !== undefined) {
      result.size = serializeSize(dec.size);
    }
    return result;
  }

  if (isSystemFieldLayout(element)) {
    const sys = element;
    const result: Record<string, unknown> = {
      code: sys.code,
      type: sys.type,
    };
    if (sys.size !== undefined) {
      result.size = serializeSize(sys.size);
    }
    return result;
  }

  return element as Record<string, unknown>;
}

function serializeLayoutRow(row: LayoutRow): Record<string, unknown> {
  return {
    type: "ROW",
    fields: row.fields.map(serializeLayoutElement),
  };
}

function serializeLayoutItem(item: LayoutItem): Record<string, unknown> {
  switch (item.type) {
    case "ROW":
      return serializeLayoutRow(item);
    case "GROUP":
      return {
        type: "GROUP",
        code: item.code as string,
        label: item.label,
        ...(item.noLabel !== undefined ? { noLabel: item.noLabel } : {}),
        ...(item.openGroup !== undefined ? { openGroup: item.openGroup } : {}),
        layout: item.layout.map(serializeLayoutRow),
      };
    case "SUBTABLE":
      return {
        type: "SUBTABLE",
        code: item.code as string,
        label: item.label,
        ...(item.noLabel !== undefined ? { noLabel: item.noLabel } : {}),
        fields: item.fields.map(serializeLayoutElement),
      };
  }
}

export const SchemaSerializer = {
  serialize: (layout: FormLayout): string => {
    const serialized = {
      layout: layout.map(serializeLayoutItem),
    };

    return stringifyYaml(serialized, {
      lineWidth: 0,
      defaultKeyType: "PLAIN",
      defaultStringType: "PLAIN",
    });
  },
};
