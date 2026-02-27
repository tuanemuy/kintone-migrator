import type { DiffResult } from "../diff";

export type AdminNotesDiffEntry = Readonly<{
  type: "modified";
  field: string;
  details: string;
}>;

export type AdminNotesDiff = DiffResult<AdminNotesDiffEntry>;
