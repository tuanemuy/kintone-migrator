import { computeActionThreeWayMerge } from "@/core/domain/action/services/actionMerge";
import type { ActionDiff } from "@/core/domain/action/valueObject";
import type { ActionDiffServiceArgs } from "../container/action";
import {
  buildRecordThreeWayDiff,
  type ThreeWayDiffResult,
} from "../threeWay/threeWayDiff";
import { detectActionDiff } from "./detectActionDiff";
import { loadActionThreeWayInputs } from "./loadActionThreeWayInputs";

export type DetectActionThreeWayDiffOutput = ThreeWayDiffResult<ActionDiff>;

/**
 * Detects action differences with 3-way awareness.
 *
 * When a state (base snapshot) exists, classifies changes into local-only,
 * remote drift, and conflicts via the record-keyed merge. When no state exists,
 * returns a two-way result carrying the existing 2-way `detectActionDiff`, which
 * the CLI renders with its 2-way printer (the 3-way printer stays generic).
 */
export async function detectActionThreeWayDiff({
  container,
}: ActionDiffServiceArgs): Promise<DetectActionThreeWayDiffOutput> {
  const { state, local, remote } = await loadActionThreeWayInputs(container);

  if (state === undefined || local === undefined) {
    const diff = await detectActionDiff({ container });
    return { mode: "two-way", diff };
  }

  const merge = computeActionThreeWayMerge(state, local, remote.config);

  return buildRecordThreeWayDiff(merge, (entry) => {
    const action = entry.local ?? entry.remote ?? entry.base;
    if (action === undefined) {
      return "";
    }
    return action.destApp.app ?? action.destApp.code ?? "(unspecified)";
  });
}
