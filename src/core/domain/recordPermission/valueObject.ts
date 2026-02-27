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
  index: number;
  details: string;
}>;

export type RecordPermissionDiffSummary = Readonly<{
  added: number;
  modified: number;
  deleted: number;
  total: number;
}>;

export type RecordPermissionDiff = Readonly<{
  entries: readonly RecordPermissionDiffEntry[];
  summary: RecordPermissionDiffSummary;
  isEmpty: boolean;
}>;
