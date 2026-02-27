export type AppPermissionEntityType =
  | "USER"
  | "GROUP"
  | "ORGANIZATION"
  | "CREATOR";

export type AppPermissionEntity = Readonly<{
  type: AppPermissionEntityType;
  code: string;
}>;

// Diff types

export type AppPermissionDiffEntry = Readonly<{
  type: "added" | "modified" | "deleted";
  entityKey: string;
  details: string;
}>;

export type AppPermissionDiffSummary = Readonly<{
  added: number;
  modified: number;
  deleted: number;
  total: number;
}>;

export type AppPermissionDiff = Readonly<{
  entries: readonly AppPermissionDiffEntry[];
  summary: AppPermissionDiffSummary;
  isEmpty: boolean;
}>;
