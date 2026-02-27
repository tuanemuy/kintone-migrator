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

import type { DiffResult } from "../diff";

export type AppPermissionDiffEntry = Readonly<{
  type: "added" | "modified" | "deleted";
  entityKey: string;
  details: string;
}>;

export type AppPermissionDiff = DiffResult<AppPermissionDiffEntry>;
