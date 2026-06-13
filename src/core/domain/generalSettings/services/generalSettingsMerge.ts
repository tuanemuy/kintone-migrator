import {
  computeSingleThreeWayMerge,
  resolveSingleMerge,
  type SingleMergeResolution,
  type SingleThreeWayMerge,
} from "../../singleMerge";
import type { GeneralSettingsConfig } from "../entity";
import { GeneralSettingsErrorCode } from "../errorCode";
import { GeneralSettingsDiffDetector } from "./diffDetector";

/**
 * Equality for two {@link GeneralSettingsConfig} values, reusing the 2-way
 * diffDetector's "no changes" semantics (kintone-default normalization of
 * optional fields). Two configs are equal exactly when the detector reports no
 * differences, so the whole-entity 3-way merge granularity matches
 * `settings diff`.
 */
export function isGeneralSettingsConfigEqual(
  a: GeneralSettingsConfig,
  b: GeneralSettingsConfig,
): boolean {
  return GeneralSettingsDiffDetector.detect(a, b).isEmpty;
}

export type GeneralSettingsThreeWayMerge =
  SingleThreeWayMerge<GeneralSettingsConfig>;

/** Computes the whole-entity 3-way merge of base/local/remote settings. */
export function computeGeneralSettingsThreeWayMerge(
  base: GeneralSettingsConfig,
  local: GeneralSettingsConfig,
  remote: GeneralSettingsConfig,
): GeneralSettingsThreeWayMerge {
  return computeSingleThreeWayMerge(
    base,
    local,
    remote,
    isGeneralSettingsConfigEqual,
  );
}

export type GeneralSettingsMergeResolution = SingleMergeResolution;

/**
 * Applies a resolved whole-entity merge, returning the merged settings config.
 * Throws a BusinessRuleError when a conflict is left unresolved (programmer
 * invariant).
 */
export function resolveGeneralSettingsMerge(
  merge: GeneralSettingsThreeWayMerge,
  resolution: GeneralSettingsMergeResolution,
): GeneralSettingsConfig {
  return resolveSingleMerge(
    merge,
    resolution,
    GeneralSettingsErrorCode.GsUnresolvedConflict,
  );
}
