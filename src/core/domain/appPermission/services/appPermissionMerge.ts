import {
  computeRecordThreeWayMerge,
  type RecordMergeResolution,
  type RecordThreeWayMerge,
  resolveRecordMerge,
} from "../../recordMerge";
import type { AppPermissionConfig, AppRight } from "../entity";
import { AppPermissionErrorCode } from "../errorCode";

/**
 * 3-way merge for the app permission domain (app-acl — ADR-188-016).
 *
 * `rights` is modeled by the entity (`type:code`) and is order-insensitive (the
 * config parser guarantees keys are unique and the 2-way `AppPermissionDiffDetector`
 * keys by `type:code`), so this is a record-keyed merge rather than a coarse
 * ordered-list merge: each right is classified independently, preserving the
 * per-entry granularity of `app-acl diff` (one entry change = one conflict).
 */

function entityKey(right: AppRight): string {
  return `${right.entity.type}:${right.entity.code}`;
}

/** Converts the ordered `rights` list into a record keyed by `type:code`. */
function toRecord(
  config: AppPermissionConfig,
): Readonly<Record<string, AppRight>> {
  const record: Record<string, AppRight> = {};
  for (const right of config.rights) {
    record[entityKey(right)] = right;
  }
  return record;
}

/**
 * Equality for two {@link AppRight} values, matching the 2-way diffDetector's
 * `compareRights` "no changes" semantics: all boolean permission flags
 * (including `includeSubs`) are compared directly. The entity is the record key
 * and is not compared here.
 */
const BOOLEAN_FLAGS = [
  "includeSubs",
  "appEditable",
  "recordViewable",
  "recordAddable",
  "recordEditable",
  "recordDeletable",
  "recordImportable",
  "recordExportable",
] as const satisfies readonly (keyof AppRight)[];

export function isAppRightEqual(a: AppRight, b: AppRight): boolean {
  return BOOLEAN_FLAGS.every((flag) => a[flag] === b[flag]);
}

export type AppPermissionThreeWayMerge = RecordThreeWayMerge<AppRight>;

/** Computes the record-keyed 3-way merge of base/local/remote app permissions. */
export function computeAppPermissionThreeWayMerge(
  base: AppPermissionConfig,
  local: AppPermissionConfig,
  remote: AppPermissionConfig,
): AppPermissionThreeWayMerge {
  return computeRecordThreeWayMerge(
    toRecord(base),
    toRecord(local),
    toRecord(remote),
    isAppRightEqual,
  );
}

export type AppPermissionMergeResolution = RecordMergeResolution;

/**
 * Applies a resolved 3-way merge, returning the merged app permission config.
 * The merged record is flattened back into a `rights` list. Throws a
 * BusinessRuleError when a conflict is left unresolved (programmer invariant).
 */
export function resolveAppPermissionMerge(
  merge: AppPermissionThreeWayMerge,
  resolution: AppPermissionMergeResolution,
): AppPermissionConfig {
  const record = resolveRecordMerge(
    merge,
    resolution,
    AppPermissionErrorCode.ApUnresolvedConflict,
  );
  return { rights: Object.values(record) };
}
