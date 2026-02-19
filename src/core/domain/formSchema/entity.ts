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
