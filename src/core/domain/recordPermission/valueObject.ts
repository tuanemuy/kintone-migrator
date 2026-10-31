import type { DiffResult } from "../diff";
import { formatValue } from "../services/formatValue";

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

export type RecordPermissionDiffEntry = Readonly<{
  type: "added" | "modified" | "deleted";
  filterCond: string;
  details: string;
}>;

export type RecordPermissionDiff = DiffResult<RecordPermissionDiffEntry>;

/**
 * Display form of a right's filterCond. filterCond is a query expression, so
 * it is quoted as a value; the empty condition targets all records.
 */
export function describeRecordPermissionFilter(filterCond: string): string {
  return filterCond === "" ? "(all records)" : formatValue(filterCond);
}
