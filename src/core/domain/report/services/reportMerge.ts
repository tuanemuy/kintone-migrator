import { deepEqual } from "@/lib/deepEqual";
import {
  computeRecordThreeWayMerge,
  type RecordMergeResolution,
  type RecordThreeWayMerge,
  resolveRecordMerge,
} from "../../recordMerge";
import type { ReportConfig, ReportsConfig } from "../entity";
import { ReportErrorCode } from "../errorCode";

/**
 * Equality for two {@link ReportConfig} values, matching the 2-way
 * diffDetector's `compareReports` "no changes" semantics: `name` / `chartType` /
 * `index` / `filterCond` are compared directly, `chartMode` treats `undefined`
 * and `""` as equivalent, and `groups` / `aggregations` / `sorts` /
 * `periodicReport` are deep-compared (`periodicReport` normalized to `null`).
 *
 * `name` is compared even though it is the record key: the parser allows an
 * explicit `name` override (`raw.name`), so the map key and `ReportConfig.name`
 * can diverge on hand-edited YAML, and `name` is sent to the API on push. The
 * 2-way `compareReports` detects this divergence, so the `eq` must too to keep
 * the same granularity.
 *
 * Reused as the `eq` for the record-keyed 3-way merge so the merge granularity
 * matches `report diff` exactly.
 */
export function isReportConfigEqual(a: ReportConfig, b: ReportConfig): boolean {
  return (
    a.name === b.name &&
    a.chartType === b.chartType &&
    (a.chartMode ?? "") === (b.chartMode ?? "") &&
    a.index === b.index &&
    a.filterCond === b.filterCond &&
    deepEqual(a.groups, b.groups) &&
    deepEqual(a.aggregations, b.aggregations) &&
    deepEqual(a.sorts, b.sorts) &&
    deepEqual(a.periodicReport ?? null, b.periodicReport ?? null)
  );
}

export type ReportThreeWayMerge = RecordThreeWayMerge<ReportConfig>;

/** Computes the record-keyed 3-way merge of base/local/remote reports. */
export function computeReportThreeWayMerge(
  base: ReportsConfig,
  local: ReportsConfig,
  remote: ReportsConfig,
): ReportThreeWayMerge {
  return computeRecordThreeWayMerge(
    base.reports,
    local.reports,
    remote.reports,
    isReportConfigEqual,
  );
}

export type ReportMergeResolution = RecordMergeResolution;

/**
 * Applies a resolved 3-way merge, returning the merged reports config. Throws a
 * BusinessRuleError when a conflict is left unresolved (programmer invariant).
 */
export function resolveReportMerge(
  merge: ReportThreeWayMerge,
  resolution: ReportMergeResolution,
): ReportsConfig {
  const reports = resolveRecordMerge(
    merge,
    resolution,
    ReportErrorCode.RtUnresolvedConflict,
  );
  return { reports };
}
