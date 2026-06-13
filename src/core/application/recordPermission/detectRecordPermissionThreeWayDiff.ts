import { computeRecordPermissionThreeWayMerge } from "@/core/domain/recordPermission/services/recordPermissionMerge";
import type { RecordPermissionDiff } from "@/core/domain/recordPermission/valueObject";
import type { RecordPermissionDiffServiceArgs } from "../container/recordPermission";
import {
  buildRecordThreeWayDiff,
  type ThreeWayDiffResult,
} from "../threeWay/threeWayDiff";
import { detectRecordPermissionDiff } from "./detectRecordPermissionDiff";
import { loadRecordPermissionThreeWayInputs } from "./loadRecordPermissionThreeWayInputs";

export type DetectRecordPermissionThreeWayDiffOutput =
  ThreeWayDiffResult<RecordPermissionDiff>;

/**
 * Detects record permission differences with 3-way awareness.
 *
 * When a state (base snapshot) exists, classifies changes into local-only,
 * remote drift, and conflicts via the record-keyed merge (keyed by
 * `filterCond#i`). When no state exists, returns a two-way result carrying the
 * existing 2-way `detectRecordPermissionDiff`, which the CLI renders with its
 * 2-way printer (the 3-way printer stays generic).
 */
export async function detectRecordPermissionThreeWayDiff({
  container,
}: RecordPermissionDiffServiceArgs): Promise<DetectRecordPermissionThreeWayDiffOutput> {
  const { state, local, remote } =
    await loadRecordPermissionThreeWayInputs(container);

  if (state === undefined || local === undefined) {
    const diff = await detectRecordPermissionDiff({ container });
    return { mode: "two-way", diff };
  }

  const merge = computeRecordPermissionThreeWayMerge(
    state,
    local,
    remote.config,
  );

  // Label by the right's filterCond (the human-meaningful grouping), falling
  // back to the composite key when no value is present (deletions on both ends).
  return buildRecordThreeWayDiff(merge, (entry) => {
    const right = entry.local ?? entry.remote ?? entry.base;
    return right?.filterCond ?? entry.key;
  });
}
