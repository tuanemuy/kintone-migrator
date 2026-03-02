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
  includeSubs?: boolean;
}>;

export type FieldPermissionDiffEntry = Readonly<{
  type: "added" | "modified" | "deleted";
  fieldCode: string;
  details: string;
}>;

export type FieldPermissionDiff = DiffResult<FieldPermissionDiffEntry>;
