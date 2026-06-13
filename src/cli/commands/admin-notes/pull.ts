import type { PullAdminNotesOutput } from "@/core/application/adminNotes/pullAdminNotes";
import {
  applyPulledAdminNotesMerge,
  pullAdminNotes,
} from "@/core/application/adminNotes/pullAdminNotes";
import { createAdminNotesCliContainer } from "@/core/application/container/adminNotesCli";
import {
  adminNotesArgs,
  resolveAdminNotesAppContainerConfig,
  resolveAdminNotesContainerConfig,
} from "../../adminNotesConfig";
import { createPullCommand } from "../pullCommandFactory";

type AdminNotesMerged = Extract<PullAdminNotesOutput, { mode: "merged" }>;

/** Fixed conflict key for the single (whole-entity) admin notes config. */
const ADMIN_NOTES_CONFLICT_KEY = "admin-notes";

export default createPullCommand<
  Parameters<typeof createAdminNotesCliContainer>[0],
  ReturnType<typeof createAdminNotesCliContainer>,
  Parameters<typeof resolveAdminNotesContainerConfig>[0],
  AdminNotesMerged
>({
  description:
    "Pull remote admin notes into the local admin notes config (3-way merge)",
  args: adminNotesArgs,
  subject: "admin notes config",
  conflictNoun: "admin notes",
  createContainer: createAdminNotesCliContainer,
  pullFn: async ({ container, input }) => {
    const result = await pullAdminNotes({ container, input });
    if (result.mode === "merged") {
      return { mode: "merged", merged: result };
    }
    return { mode: result.mode };
  },
  getMergeView: (merged) => ({
    hasConflict: merged.merge.hasConflict,
    conflicts: merged.merge.hasConflict
      ? [{ key: ADMIN_NOTES_CONFLICT_KEY }]
      : [],
  }),
  applyMerge: async ({ container, merged, resolution }) => {
    await applyPulledAdminNotesMerge({
      container,
      input: {
        merge: merged.merge,
        resolution: resolution.get(ADMIN_NOTES_CONFLICT_KEY),
        remoteConfig: merged.remoteConfig,
        remoteRevision: merged.remoteRevision,
      },
    });
  },
  resolveContainerConfig: resolveAdminNotesContainerConfig,
  resolveAppContainerConfig: resolveAdminNotesAppContainerConfig,
});
