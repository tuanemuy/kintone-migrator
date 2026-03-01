import { AdminNotesDiffDetector } from "@/core/domain/adminNotes/services/diffDetector";
import type { AdminNotesDiff } from "@/core/domain/adminNotes/valueObject";
import type { AdminNotesDiffServiceArgs } from "../container/adminNotes";
import { detectDiffFromConfig } from "../detectDiffBase";
import { parseAdminNotesConfigText } from "./parseConfig";

export type { AdminNotesDiffEntry } from "@/core/domain/adminNotes/valueObject";

export async function detectAdminNotesDiff({
  container,
}: AdminNotesDiffServiceArgs): Promise<AdminNotesDiff> {
  return detectDiffFromConfig({
    getStorage: () => container.adminNotesStorage.get(),
    fetchRemote: () => container.adminNotesConfigurator.getAdminNotes(),
    parseConfig: parseAdminNotesConfigText,
    detect: (local, remote) =>
      AdminNotesDiffDetector.detect(local, remote.config),
    notFoundMessage: "Admin notes config file not found",
  });
}
