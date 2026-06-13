import { computeAdminNotesThreeWayMerge } from "@/core/domain/adminNotes/services/adminNotesMerge";
import type { AdminNotesDiff } from "@/core/domain/adminNotes/valueObject";
import type { AdminNotesDiffServiceArgs } from "../container/adminNotes";
import {
  buildSingleThreeWayDiff,
  type ThreeWayDiffResult,
} from "../threeWay/threeWayDiff";
import { detectAdminNotesDiff } from "./detectAdminNotesDiff";
import { loadAdminNotesThreeWayInputs } from "./loadAdminNotesThreeWayInputs";

/** Fixed key/label for the whole-entity admin notes diff entry (ADR-188-014). */
const ADMIN_NOTES_DIFF_KEY = "admin-notes";

export type DetectAdminNotesThreeWayDiffOutput =
  ThreeWayDiffResult<AdminNotesDiff>;

/**
 * Detects admin notes differences with 3-way awareness (AC-4). When a state
 * exists, classifies the whole config into a single local-only / remote-drift /
 * conflict entry; otherwise falls back to the existing 2-way diff.
 */
export async function detectAdminNotesThreeWayDiff({
  container,
}: AdminNotesDiffServiceArgs): Promise<DetectAdminNotesThreeWayDiffOutput> {
  const { state, local, remote } =
    await loadAdminNotesThreeWayInputs(container);

  if (state === undefined || local === undefined) {
    const diff = await detectAdminNotesDiff({ container });
    return { mode: "two-way", diff };
  }

  const merge = computeAdminNotesThreeWayMerge(state, local, remote.config);

  return buildSingleThreeWayDiff(merge, ADMIN_NOTES_DIFF_KEY);
}
