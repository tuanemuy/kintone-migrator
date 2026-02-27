import type { DiffResult } from "../diff";

export type RecordPermissionEntityType =
  | "USER"
  | "GROUP"
  | "ORGANIZATION"
  | "FIELD_ENTITY";

export type RecordPermissionEntity = Readonly<{
  type: RecordPermissionEntityType;
  code: string;
}>;

export type RecordPermissionRightEntity = Readonly<{
  entity: RecordPermissionEntity;
  viewable: boolean;
  editable: boolean;
  deletable: boolean;
  includeSubs: boolean;
}>;

// Diff types

export type RecordPermissionDiffEntry = Readonly<{
  type: "added" | "modified" | "deleted";
  filterCond: string;
  details: string;
}>;

export type RecordPermissionDiff = DiffResult<RecordPermissionDiffEntry>;
