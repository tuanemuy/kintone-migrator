import { computeGeneralSettingsThreeWayMerge } from "@/core/domain/generalSettings/services/generalSettingsMerge";
import type { GeneralSettingsDiff } from "@/core/domain/generalSettings/valueObject";
import type { GeneralSettingsDiffServiceArgs } from "../container/generalSettings";
import {
  buildSingleThreeWayDiff,
  type ThreeWayDiffResult,
} from "../threeWay/threeWayDiff";
import { detectGeneralSettingsDiff } from "./detectGeneralSettingsDiff";
import { loadGeneralSettingsThreeWayInputs } from "./loadGeneralSettingsThreeWayInputs";

/** Fixed key/label for the whole-entity settings diff entry. */
const SETTINGS_DIFF_KEY = "settings";

export type DetectGeneralSettingsThreeWayDiffOutput =
  ThreeWayDiffResult<GeneralSettingsDiff>;

/**
 * Detects general settings differences with 3-way awareness.
 *
 * When a state (base snapshot) exists, classifies the whole config into a single
 * local-only / remote-drift / conflict entry. When no state exists, returns a
 * two-way result carrying the existing 2-way diff, which the CLI renders with
 * its 2-way printer (the 3-way printer stays generic).
 */
export async function detectGeneralSettingsThreeWayDiff({
  container,
}: GeneralSettingsDiffServiceArgs): Promise<DetectGeneralSettingsThreeWayDiffOutput> {
  const { state, local, remote } =
    await loadGeneralSettingsThreeWayInputs(container);

  if (state === undefined || local === undefined) {
    const diff = await detectGeneralSettingsDiff({ container });
    return { mode: "two-way", diff };
  }

  const merge = computeGeneralSettingsThreeWayMerge(
    state,
    local,
    remote.config,
  );

  return buildSingleThreeWayDiff(merge, SETTINGS_DIFF_KEY);
}
