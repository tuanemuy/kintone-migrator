import { computeFieldPermissionThreeWayMerge } from "@/core/domain/fieldPermission/services/fieldPermissionMerge";
import type { FieldPermissionDiff } from "@/core/domain/fieldPermission/valueObject";
import type { FieldPermissionDiffServiceArgs } from "../container/fieldPermission";
import {
  buildRecordThreeWayDiff,
  type ThreeWayDiffResult,
} from "../threeWay/threeWayDiff";
import { detectFieldPermissionDiff } from "./detectFieldPermissionDiff";
import { loadFieldPermissionThreeWayInputs } from "./loadFieldPermissionThreeWayInputs";

export type DetectFieldPermissionThreeWayDiffOutput =
  ThreeWayDiffResult<FieldPermissionDiff>;

/**
 * Detects field permission differences with 3-way awareness (AC-7).
 *
 * When a state (base snapshot) exists, classifies changes into local-only,
 * remote drift, and conflicts via the record-keyed merge (keyed by field
 * `code`). When no state exists, returns a two-way result carrying the existing
 * 2-way `detectFieldPermissionDiff`, which the CLI renders with its 2-way
 * printer (the 3-way printer stays generic).
 */
export async function detectFieldPermissionThreeWayDiff({
  container,
}: FieldPermissionDiffServiceArgs): Promise<DetectFieldPermissionThreeWayDiffOutput> {
  const { state, local, remote } =
    await loadFieldPermissionThreeWayInputs(container);

  if (state === undefined || local === undefined) {
    const diff = await detectFieldPermissionDiff({ container });
    return { mode: "two-way", diff };
  }

  const merge = computeFieldPermissionThreeWayMerge(
    state,
    local,
    remote.config,
  );

  // The record key is the field `code`, which is also the human label.
  return buildRecordThreeWayDiff(merge, (entry) => entry.key);
}
