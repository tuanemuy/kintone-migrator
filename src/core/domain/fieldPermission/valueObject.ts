import type { DiffResult } from "../diff";

export type FieldRightAccessibility = "READ" | "WRITE" | "NONE";

export type FieldPermissionEntityType =
  | "USER"
  | "GROUP"
  | "ORGANIZATION"
  | "FIELD_ENTITY";

export type FieldPermissionEntity = Readonly<{
  type: FieldPermissionEntityType;
  code: string;
}>;

export type FieldRightEntity = Readonly<{
  accessibility: FieldRightAccessibility;
  entity: FieldPermissionEntity;
  /** Optional because kintone API omits includeSubs for field permissions when it is false, unlike recordPermission where it is always present. */
  includeSubs?: boolean;
}>;

export type FieldPermissionDiffEntry = Readonly<{
  type: "added" | "modified" | "deleted";
  fieldCode: string;
  details: string;
}>;

export type FieldPermissionDiff = DiffResult<FieldPermissionDiffEntry>;
