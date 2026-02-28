import { buildDiffResult, type DiffSummary } from "../diff";
import type { FieldCode, FieldDefinition, LayoutElement } from "./valueObject";

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

export type ReferenceTableLayoutItem = Readonly<{
  type: "REFERENCE_TABLE";
  code: FieldCode;
  label: string;
  noLabel?: boolean;
}>;

export type LayoutItem =
  | LayoutRow
  | GroupLayoutItem
  | SubtableLayoutItem
  | ReferenceTableLayoutItem;

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
  type: "added" | "modified" | "deleted";
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
  create: (entries: readonly DiffEntry[]): FormDiff => buildDiffResult(entries),
};
