import {
  computeSingleThreeWayMerge,
  resolveSingleMerge,
  type SingleMergeResolution,
  type SingleThreeWayMerge,
} from "../../singleMerge";
import type { AdminNotesConfig } from "../entity";
import { AdminNotesErrorCode } from "../errorCode";
import { AdminNotesDiffDetector } from "./diffDetector";

/**
 * Equality for two {@link AdminNotesConfig} values, reusing the 2-way
 * diffDetector's "no changes" semantics (`content` + `includeInTemplateAnd
 * Duplicates`). Two configs are equal exactly when the detector reports no
 * differences, so the whole-entity 3-way merge granularity matches
 * `admin-notes diff` (ADR-188-014).
 */
export function isAdminNotesConfigEqual(
  a: AdminNotesConfig,
  b: AdminNotesConfig,
): boolean {
  return AdminNotesDiffDetector.detect(a, b).isEmpty;
}

export type AdminNotesThreeWayMerge = SingleThreeWayMerge<AdminNotesConfig>;

/** Computes the whole-entity 3-way merge of base/local/remote admin notes. */
export function computeAdminNotesThreeWayMerge(
  base: AdminNotesConfig,
  local: AdminNotesConfig,
  remote: AdminNotesConfig,
): AdminNotesThreeWayMerge {
  return computeSingleThreeWayMerge(
    base,
    local,
    remote,
    isAdminNotesConfigEqual,
  );
}

export type AdminNotesMergeResolution = SingleMergeResolution;

/**
 * Applies a resolved whole-entity merge, returning the merged admin notes
 * config. Throws a BusinessRuleError when a conflict is left unresolved
 * (programmer invariant).
 */
export function resolveAdminNotesMerge(
  merge: AdminNotesThreeWayMerge,
  resolution: AdminNotesMergeResolution,
): AdminNotesConfig {
  return resolveSingleMerge(
    merge,
    resolution,
    AdminNotesErrorCode.AnUnresolvedConflict,
  );
}
