export type FieldRightAccessibility = "READ" | "WRITE" | "NONE";

export type EntityType = "USER" | "GROUP" | "ORGANIZATION" | "FIELD_ENTITY";

export type FieldPermissionEntity = Readonly<{
  type: EntityType;
  code: string;
}>;

export type FieldRightEntity = Readonly<{
  accessibility: FieldRightAccessibility;
  entity: FieldPermissionEntity;
  includeSubs?: boolean;
}>;

// Diff types

import type { DiffResult } from "../diff";

export type FieldPermissionDiffEntry = Readonly<{
  type: "added" | "modified" | "deleted";
  fieldCode: string;
  details: string;
}>;

export type FieldPermissionDiff = DiffResult<FieldPermissionDiffEntry>;
