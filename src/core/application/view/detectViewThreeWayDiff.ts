import { computeViewThreeWayMerge } from "@/core/domain/view/services/viewMerge";
import type { ViewDiff } from "@/core/domain/view/valueObject";
import type { ViewDiffServiceArgs } from "../container/view";
import {
  buildRecordThreeWayDiff,
  type ThreeWayDiffResult,
} from "../threeWay/threeWayDiff";
import { detectViewDiff } from "./detectViewDiff";
import { loadViewThreeWayInputs } from "./loadViewThreeWayInputs";

export type DetectViewThreeWayDiffOutput = ThreeWayDiffResult<ViewDiff>;

/**
 * Detects view differences with 3-way awareness (AC-3).
 *
 * When a state (base snapshot) exists, classifies changes into local-only,
 * remote drift, and conflicts via the record-keyed merge. When no state exists,
 * returns a two-way result carrying the existing 2-way `detectViewDiff`, which
 * the CLI renders with its 2-way printer (the 3-way printer stays generic).
 */
export async function detectViewThreeWayDiff({
  container,
}: ViewDiffServiceArgs): Promise<DetectViewThreeWayDiffOutput> {
  const { state, local, remote } = await loadViewThreeWayInputs(container);

  if (state === undefined || local === undefined) {
    const diff = await detectViewDiff({ container });
    return { mode: "two-way", diff };
  }

  const merge = computeViewThreeWayMerge(state, local, remote.config);

  return buildRecordThreeWayDiff(merge, (entry) => {
    const view = entry.local ?? entry.remote ?? entry.base;
    return view?.type ?? "";
  });
}
