import type {
  DiffSummary,
  DiffType,
  FieldCode,
  FieldDefinition,
  LayoutElement,
} from "./valueObject";

// Layout types

export type LayoutRow = Readonly<{
  type: "ROW";
  fields: readonly LayoutElement[];
}>;

export type GroupLayoutItem = Readonly<{
  type: "GROUP";
  code: FieldCode;
  label: string;
  noLabel?: boolean;
  openGroup?: boolean;
  layout: readonly LayoutRow[];
}>;

export type SubtableLayoutItem = Readonly<{
  type: "SUBTABLE";
  code: FieldCode;
  label: string;
  noLabel?: boolean;
  fields: readonly LayoutElement[];
}>;

export type LayoutItem = LayoutRow | GroupLayoutItem | SubtableLayoutItem;

export type FormLayout = readonly LayoutItem[];

// Schema
export type Schema = Readonly<{
  fields: ReadonlyMap<FieldCode, FieldDefinition>;
  layout: FormLayout;
}>;

export const Schema = {
  create: (
    fields: ReadonlyMap<FieldCode, FieldDefinition>,
    layout: FormLayout,
  ): Schema => ({
    fields,
    layout,
  }),
};

// Layout enrichment

function enrichLayoutElement(
  element: LayoutElement,
  fields: ReadonlyMap<FieldCode, FieldDefinition>,
): LayoutElement {
  if (!("field" in element)) return element;
  const fullField = fields.get(element.field.code);
  if (fullField === undefined) return element;
  return {
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

// Subtable inner field codes

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

// DiffEntry
export type DiffEntry = Readonly<{
  type: DiffType;
  fieldCode: FieldCode;
  fieldLabel: string;
  details: string;
  before?: FieldDefinition;
  after?: FieldDefinition;
}>;

// FormDiff
export type FormDiff = Readonly<{
  entries: readonly DiffEntry[];
  summary: DiffSummary;
  isEmpty: boolean;
}>;

export const FormDiff = {
  create: (entries: readonly DiffEntry[]): FormDiff => {
    const summary: DiffSummary = {
      added: entries.filter((e) => e.type === "added").length,
      modified: entries.filter((e) => e.type === "modified").length,
      deleted: entries.filter((e) => e.type === "deleted").length,
      total: entries.length,
    };

    const sortOrder: Record<DiffType, number> = {
      added: 0,
      modified: 1,
      deleted: 2,
    };

    const sorted = [...entries].sort(
      (a, b) => sortOrder[a.type] - sortOrder[b.type],
    );

    return {
      entries: sorted,
      summary,
      isEmpty: entries.length === 0,
    };
  },
};
