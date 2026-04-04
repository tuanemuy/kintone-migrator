import { buildDiffResult } from "../../diff";
import type { AdminNotesConfig } from "../entity";
import type { AdminNotesDiff, AdminNotesDiffEntry } from "../valueObject";

const CONTENT_TRUNCATE_LENGTH = 30;

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}

function compareConfigs(
  local: AdminNotesConfig,
  remote: AdminNotesConfig,
): AdminNotesDiffEntry[] {
  const entries: AdminNotesDiffEntry[] = [];

  if (local.content !== remote.content) {
    entries.push({
      type: "modified",
      field: "content",
      details: `"${truncate(remote.content, CONTENT_TRUNCATE_LENGTH)}" -> "${truncate(local.content, CONTENT_TRUNCATE_LENGTH)}"`,
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

// AdminNotes only supports "modified" entries (singleton config, no add/delete)
export const AdminNotesDiffDetector = {
  detect: (
    local: AdminNotesConfig,
    remote: AdminNotesConfig,
  ): AdminNotesDiff => {
    const entries = compareConfigs(local, remote);
    return buildDiffResult(entries);
  },
};
