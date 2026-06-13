import { deepEqual } from "@/lib/deepEqual";
import { groupByKey } from "@/lib/groupByKey";
import {
  computeRecordThreeWayMerge,
  type RecordMergeResolution,
  type RecordThreeWayMerge,
  resolveRecordMerge,
} from "../../recordMerge";
import type { RecordPermissionConfig, RecordRight } from "../entity";
import { RecordPermissionErrorCode } from "../errorCode";

/**
 * 3-way merge for the record permission domain (record-acl).
 *
 * `rights` has no stable per-entry key: the 2-way `RecordPermissionDiffDetector`
 * groups by `filterCond` and matches positionally within each group. This merge
 * mirrors that key strategy exactly — group by `filterCond`, then key each entry
 * by its group-local index (`filterCond#i`) — so it is record-keyed (not a
 * coarse ordered-list merge) and the per-entry granularity of `record-acl diff`
 * is preserved (one entry change = one conflict). The `perRecordLabel`-style
 * positional matching means a reordering within a filterCond is seen as content
 * changes at those indices, matching the existing 2-way detector.
 */

function compositeKey(filterCond: string, index: number): string {
  // "#" is safe: kintone filterCond strings can contain arbitrary characters,
  // but the index suffix is appended after the full filterCond, so the
  // group-local index is unambiguous within a single grouping pass.
  return `${filterCond}#${index}`;
}

/** Converts the ordered `rights` list into a record keyed by `filterCond#i`. */
function toRecord(
  config: RecordPermissionConfig,
): Readonly<Record<string, RecordRight>> {
  const record: Record<string, RecordRight> = {};
  const grouped = groupByKey(config.rights, (r) => r.filterCond);
  for (const [filterCond, group] of grouped) {
    group.forEach((right, i) => {
      record[compositeKey(filterCond, i)] = right;
    });
  }
  return record;
}

/**
 * Equality for two {@link RecordRight} values, matching the 2-way diffDetector's
 * `isRightEqual` semantics: the `entities` lists are deep-compared (type / code /
 * viewable / editable / deletable / includeSubs). `filterCond` is part of the
 * record key and is not compared here.
 */
export function isRecordRightEqual(a: RecordRight, b: RecordRight): boolean {
  return deepEqual(
    a.entities.map((e) => ({
      type: e.entity.type,
      code: e.entity.code,
      viewable: e.viewable,
      editable: e.editable,
      deletable: e.deletable,
      includeSubs: e.includeSubs,
    })),
    b.entities.map((e) => ({
      type: e.entity.type,
      code: e.entity.code,
      viewable: e.viewable,
      editable: e.editable,
      deletable: e.deletable,
      includeSubs: e.includeSubs,
    })),
  );
}

export type RecordPermissionThreeWayMerge = RecordThreeWayMerge<RecordRight>;

/** Computes the record-keyed 3-way merge of base/local/remote record permissions. */
export function computeRecordPermissionThreeWayMerge(
  base: RecordPermissionConfig,
  local: RecordPermissionConfig,
  remote: RecordPermissionConfig,
): RecordPermissionThreeWayMerge {
  return computeRecordThreeWayMerge(
    toRecord(base),
    toRecord(local),
    toRecord(remote),
    isRecordRightEqual,
  );
}

export type RecordPermissionMergeResolution = RecordMergeResolution;

/**
 * Applies a resolved 3-way merge, returning the merged record permission config.
 * The merged record is flattened back into a `rights` list. Throws a
 * BusinessRuleError when a conflict is left unresolved (programmer invariant).
 */
export function resolveRecordPermissionMerge(
  merge: RecordPermissionThreeWayMerge,
  resolution: RecordPermissionMergeResolution,
): RecordPermissionConfig {
  const record = resolveRecordMerge(
    merge,
    resolution,
    RecordPermissionErrorCode.RpUnresolvedConflict,
  );
  return { rights: Object.values(record) };
}
