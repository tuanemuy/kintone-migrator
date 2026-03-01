import type { DiffResult } from "../diff";

/** Only "modified" is used because admin notes is a singleton config with no add/delete semantics. */
export type AdminNotesDiffEntry = Readonly<{
  type: "modified";
  field: string;
  details: string;
}>;

export type AdminNotesDiff = DiffResult<AdminNotesDiffEntry>;
