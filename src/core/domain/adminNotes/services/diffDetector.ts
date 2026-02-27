import type { AdminNotesConfig } from "../entity";
import type { AdminNotesDiff, AdminNotesDiffEntry } from "../valueObject";

function compareConfigs(
  local: AdminNotesConfig,
  remote: AdminNotesConfig,
): AdminNotesDiffEntry[] {
  const entries: AdminNotesDiffEntry[] = [];

  if (local.content !== remote.content) {
    entries.push({
      type: "modified",
      field: "content",
      details: "content changed",
    });
  }

  if (
    local.includeInTemplateAndDuplicates !==
    remote.includeInTemplateAndDuplicates
  ) {
    entries.push({
      type: "modified",
      field: "includeInTemplateAndDuplicates",
      details: `${String(remote.includeInTemplateAndDuplicates)} -> ${String(local.includeInTemplateAndDuplicates)}`,
    });
  }

  return entries;
}

export const AdminNotesDiffDetector = {
  detect: (
    local: AdminNotesConfig,
    remote: AdminNotesConfig,
  ): AdminNotesDiff => {
    const entries = compareConfigs(local, remote);
    const modified = entries.length;

    return {
      entries,
      summary: { added: 0, modified, deleted: 0, total: modified },
      isEmpty: entries.length === 0,
    };
  },
};
