import { deepEqual } from "@/lib/deepEqual";
import {
  computeRecordThreeWayMerge,
  type RecordMergeResolution,
  type RecordThreeWayMerge,
  resolveRecordMerge,
} from "../../recordMerge";
import type { ActionConfig, ActionsConfig } from "../entity";
import { ActionErrorCode } from "../errorCode";

/**
 * Equality for two {@link ActionConfig} values, matching the 2-way
 * diffDetector's `compareActions` "no changes" semantics: `index` and
 * `filterCond` are compared directly, and `destApp` / `mappings` / `entities`
 * are deep-compared. `name` is the record key and is not compared here.
 *
 * Reused as the `eq` for the record-keyed 3-way merge so the merge granularity
 * matches `action diff` exactly.
 */
export function isActionConfigEqual(a: ActionConfig, b: ActionConfig): boolean {
  return (
    a.index === b.index &&
    a.filterCond === b.filterCond &&
    deepEqual(a.destApp, b.destApp) &&
    deepEqual(a.mappings, b.mappings) &&
    deepEqual(a.entities, b.entities)
  );
}

export type ActionThreeWayMerge = RecordThreeWayMerge<ActionConfig>;

/** Computes the record-keyed 3-way merge of base/local/remote actions. */
export function computeActionThreeWayMerge(
  base: ActionsConfig,
  local: ActionsConfig,
  remote: ActionsConfig,
): ActionThreeWayMerge {
  return computeRecordThreeWayMerge(
    base.actions,
    local.actions,
    remote.actions,
    isActionConfigEqual,
  );
}

export type ActionMergeResolution = RecordMergeResolution;

/**
 * Applies a resolved 3-way merge, returning the merged actions config. Throws a
 * BusinessRuleError when a conflict is left unresolved (programmer invariant).
 */
export function resolveActionMerge(
  merge: ActionThreeWayMerge,
  resolution: ActionMergeResolution,
): ActionsConfig {
  const actions = resolveRecordMerge(
    merge,
    resolution,
    ActionErrorCode.AcUnresolvedConflict,
  );
  return { actions };
}
