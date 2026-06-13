import { deepEqual } from "@/lib/deepEqual";
import {
  computeRecordThreeWayMerge,
  type RecordMergeResolution,
  type RecordThreeWayMerge,
  resolveRecordMerge,
} from "../../recordMerge";
import type { FieldPermissionConfig, FieldRight } from "../entity";
import { FieldPermissionErrorCode } from "../errorCode";

/**
 * 3-way merge for the field permission domain (field-acl — ADR-188-016).
 *
 * Each field's rights are keyed by the field `code`, which the 2-way
 * `FieldPermissionDiffDetector` uses and the config parser guarantees is unique.
 * Within a field, the ordered `entities` list determines precedence, but it has
 * no stable per-entity key — so a field is the merge unit and its `entities`
 * list is compared as one value (matching the diffDetector's per-field
 * granularity). This makes the domain record-keyed (keyed by field `code`)
 * rather than a coarse whole-config merge, preserving the per-field granularity
 * of `field-acl diff` (one field change = one conflict).
 */

/** Converts the ordered `rights` list into a record keyed by field `code`. */
function toRecord(
  config: FieldPermissionConfig,
): Readonly<Record<string, FieldRight>> {
  const record: Record<string, FieldRight> = {};
  for (const right of config.rights) {
    record[right.code] = right;
  }
  return record;
}

/**
 * Equality for two {@link FieldRight} values, matching the 2-way diffDetector's
 * `isEntitiesEqual` semantics: the `entities` lists are deep-compared
 * (accessibility / type / code / includeSubs, with `undefined` includeSubs
 * normalized to `false`). The field `code` is the record key and is not compared
 * here.
 */
export function isFieldRightEqual(a: FieldRight, b: FieldRight): boolean {
  return deepEqual(
    a.entities.map((e) => ({
      accessibility: e.accessibility,
      type: e.entity.type,
      code: e.entity.code,
      includeSubs: e.includeSubs ?? false,
    })),
    b.entities.map((e) => ({
      accessibility: e.accessibility,
      type: e.entity.type,
      code: e.entity.code,
      includeSubs: e.includeSubs ?? false,
    })),
  );
}

export type FieldPermissionThreeWayMerge = RecordThreeWayMerge<FieldRight>;

/** Computes the record-keyed 3-way merge of base/local/remote field permissions. */
export function computeFieldPermissionThreeWayMerge(
  base: FieldPermissionConfig,
  local: FieldPermissionConfig,
  remote: FieldPermissionConfig,
): FieldPermissionThreeWayMerge {
  return computeRecordThreeWayMerge(
    toRecord(base),
    toRecord(local),
    toRecord(remote),
    isFieldRightEqual,
  );
}

export type FieldPermissionMergeResolution = RecordMergeResolution;

/**
 * Applies a resolved 3-way merge, returning the merged field permission config.
 * The merged record is flattened back into a `rights` list. Throws a
 * BusinessRuleError when a conflict is left unresolved (programmer invariant).
 */
export function resolveFieldPermissionMerge(
  merge: FieldPermissionThreeWayMerge,
  resolution: FieldPermissionMergeResolution,
): FieldPermissionConfig {
  const record = resolveRecordMerge(
    merge,
    resolution,
    FieldPermissionErrorCode.FpUnresolvedConflict,
  );
  return { rights: Object.values(record) };
}
