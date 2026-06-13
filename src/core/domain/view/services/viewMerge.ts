import { deepEqual } from "@/lib/deepEqual";
import {
  computeRecordThreeWayMerge,
  type RecordMergeResolution,
  type RecordThreeWayMerge,
  resolveRecordMerge,
} from "../../recordMerge";
import type { ViewConfig, ViewsConfig } from "../entity";
import { ViewErrorCode } from "../errorCode";

/**
 * Equality for two {@link ViewConfig} values, matching the 2-way diffDetector's
 * "no changes" semantics: optional strings treat `undefined` and `""` as
 * equivalent (kintone returns `""` for absent fields), `pager` defaults to
 * `false`, and `fields` defaults to `[]`. `name` is the record key and is not
 * compared here.
 *
 * Reused as the `eq` for the record-keyed 3-way merge so the merge granularity
 * matches `view diff` exactly.
 */
export function isViewConfigEqual(a: ViewConfig, b: ViewConfig): boolean {
  return (
    a.type === b.type &&
    (a.builtinType ?? "") === (b.builtinType ?? "") &&
    a.index === b.index &&
    (a.filterCond ?? "") === (b.filterCond ?? "") &&
    (a.sort ?? "") === (b.sort ?? "") &&
    (a.date ?? "") === (b.date ?? "") &&
    (a.title ?? "") === (b.title ?? "") &&
    (a.html ?? "") === (b.html ?? "") &&
    (a.pager ?? false) === (b.pager ?? false) &&
    (a.device ?? "") === (b.device ?? "") &&
    deepEqual(a.fields ?? [], b.fields ?? [])
  );
}

export type ViewThreeWayMerge = RecordThreeWayMerge<ViewConfig>;

/** Computes the record-keyed 3-way merge of base/local/remote views. */
export function computeViewThreeWayMerge(
  base: ViewsConfig,
  local: ViewsConfig,
  remote: ViewsConfig,
): ViewThreeWayMerge {
  return computeRecordThreeWayMerge(
    base.views,
    local.views,
    remote.views,
    isViewConfigEqual,
  );
}

export type ViewMergeResolution = RecordMergeResolution;

/**
 * Applies a resolved 3-way merge, returning the merged views config. Throws a
 * BusinessRuleError when a conflict is left unresolved (programmer invariant).
 */
export function resolveViewMerge(
  merge: ViewThreeWayMerge,
  resolution: ViewMergeResolution,
): ViewsConfig {
  const views = resolveRecordMerge(
    merge,
    resolution,
    ViewErrorCode.VwUnresolvedConflict,
  );
  return { views };
}
