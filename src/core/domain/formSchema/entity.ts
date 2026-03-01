import { BusinessRuleError } from "@/core/domain/error";
import { FormSchemaErrorCode } from "./errorCode";
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
  ): Schema => {
    if (fields.size === 0) {
      throw new BusinessRuleError(
        FormSchemaErrorCode.FsInvalidSchemaStructure,
        "Schema must have at least one field",
      );
    }
    return { fields, layout };
  },
};
