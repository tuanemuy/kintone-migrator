import { computeProcessManagementThreeWayMerge } from "@/core/domain/processManagement/services/processManagementMerge";
import type { ProcessManagementDiff } from "@/core/domain/processManagement/valueObject";
import type { ProcessManagementDiffServiceArgs } from "../container/processManagement";
import {
  buildSingleThreeWayDiff,
  type ThreeWayDiffResult,
} from "../threeWay/threeWayDiff";
import { detectProcessManagementDiff } from "./detectProcessManagementDiff";
import { loadProcessManagementThreeWayInputs } from "./loadProcessManagementThreeWayInputs";

/** Fixed key/label for the whole-entity process diff entry. */
const PROCESS_DIFF_KEY = "process";

export type DetectProcessManagementThreeWayDiffOutput =
  ThreeWayDiffResult<ProcessManagementDiff>;

/**
 * Detects process management differences with 3-way awareness. When a
 * state exists, classifies the whole config into a single local-only /
 * remote-drift / conflict entry; otherwise falls back to the existing 2-way
 * diff.
 */
export async function detectProcessManagementThreeWayDiff({
  container,
}: ProcessManagementDiffServiceArgs): Promise<DetectProcessManagementThreeWayDiffOutput> {
  const { state, local, remote } =
    await loadProcessManagementThreeWayInputs(container);

  if (state === undefined || local === undefined) {
    const diff = await detectProcessManagementDiff({ container });
    return { mode: "two-way", diff };
  }

  const merge = computeProcessManagementThreeWayMerge(
    state,
    local,
    remote.config,
  );

  return buildSingleThreeWayDiff(merge, PROCESS_DIFF_KEY);
}
