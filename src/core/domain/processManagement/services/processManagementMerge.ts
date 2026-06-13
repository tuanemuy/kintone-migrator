import {
  computeSingleThreeWayMerge,
  resolveSingleMerge,
  type SingleMergeResolution,
  type SingleThreeWayMerge,
} from "../../singleMerge";
import type { ProcessManagementConfig } from "../entity";
import { ProcessManagementErrorCode } from "../errorCode";
import { ProcessManagementDiffDetector } from "./diffDetector";

/**
 * Equality for two {@link ProcessManagementConfig} values, reusing the 2-way
 * diffDetector's "no changes" semantics (`enable` + order-sensitive entity
 * comparison for states/actions). Two configs are equal exactly when the
 * detector reports no differences, so the whole-entity 3-way merge granularity
 * matches `process diff`.
 *
 * Note: `ProcessManagementDiffDetector.detect` is not symmetric in its output
 * text, but it IS symmetric in `isEmpty` — it enumerates added/modified/deleted
 * over the union of state/action keys, so `detect(a, b).isEmpty` is true iff
 * every key matches, regardless of argument order.
 */
export function isProcessManagementConfigEqual(
  a: ProcessManagementConfig,
  b: ProcessManagementConfig,
): boolean {
  return ProcessManagementDiffDetector.detect(a, b).isEmpty;
}

export type ProcessManagementThreeWayMerge =
  SingleThreeWayMerge<ProcessManagementConfig>;

/** Computes the whole-entity 3-way merge of base/local/remote process config. */
export function computeProcessManagementThreeWayMerge(
  base: ProcessManagementConfig,
  local: ProcessManagementConfig,
  remote: ProcessManagementConfig,
): ProcessManagementThreeWayMerge {
  return computeSingleThreeWayMerge(
    base,
    local,
    remote,
    isProcessManagementConfigEqual,
  );
}

export type ProcessManagementMergeResolution = SingleMergeResolution;

/**
 * Applies a resolved whole-entity merge, returning the merged process config.
 * Throws a BusinessRuleError when a conflict is left unresolved (programmer
 * invariant).
 */
export function resolveProcessManagementMerge(
  merge: ProcessManagementThreeWayMerge,
  resolution: ProcessManagementMergeResolution,
): ProcessManagementConfig {
  return resolveSingleMerge(
    merge,
    resolution,
    ProcessManagementErrorCode.PmUnresolvedConflict,
  );
}
