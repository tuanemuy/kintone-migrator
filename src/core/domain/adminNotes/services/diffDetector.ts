import { buildDiffResult } from "../../diff";
import { formatValue } from "../../services/formatValue";
import type { AdminNotesConfig } from "../entity";
import type { AdminNotesDiff, AdminNotesDiffEntry } from "../valueObject";

const CONTENT_TRUNCATE_LENGTH = 30;

// The ellipsis stays outside the quotes so that the quoted part is always
// literal content. Counting code points keeps surrogate pairs whole.
function formatContentPreview(text: string, maxLength: number): string {
  const codePoints = Array.from(text);
  if (codePoints.length <= maxLength) return formatValue(text);
  return `${formatValue(codePoints.slice(0, maxLength).join(""))}...`;
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
      details: `${formatContentPreview(remote.content, CONTENT_TRUNCATE_LENGTH)} -> ${formatContentPreview(local.content, CONTENT_TRUNCATE_LENGTH)}`,
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
