import { computeAppPermissionThreeWayMerge } from "@/core/domain/appPermission/services/appPermissionMerge";
import type { AppPermissionDiff } from "@/core/domain/appPermission/valueObject";
import type { AppPermissionDiffServiceArgs } from "../container/appPermission";
import {
  buildRecordThreeWayDiff,
  type ThreeWayDiffResult,
} from "../threeWay/threeWayDiff";
import { detectAppPermissionDiff } from "./detectAppPermissionDiff";
import { loadAppPermissionThreeWayInputs } from "./loadAppPermissionThreeWayInputs";

export type DetectAppPermissionThreeWayDiffOutput =
  ThreeWayDiffResult<AppPermissionDiff>;

/**
 * Detects app permission differences with 3-way awareness.
 *
 * When a state (base snapshot) exists, classifies changes into local-only,
 * remote drift, and conflicts via the record-keyed merge (keyed by entity
 * `type:code`). When no state exists, returns a two-way result carrying the
 * existing 2-way `detectAppPermissionDiff`, which the CLI renders with its 2-way
 * printer (the 3-way printer stays generic).
 */
export async function detectAppPermissionThreeWayDiff({
  container,
}: AppPermissionDiffServiceArgs): Promise<DetectAppPermissionThreeWayDiffOutput> {
  const { state, local, remote } =
    await loadAppPermissionThreeWayInputs(container);

  if (state === undefined || local === undefined) {
    const diff = await detectAppPermissionDiff({ container });
    return { mode: "two-way", diff };
  }

  const merge = computeAppPermissionThreeWayMerge(state, local, remote.config);

  // The record key is the entity `type:code`, which is also the human label.
  return buildRecordThreeWayDiff(merge, (entry) => entry.key);
}
