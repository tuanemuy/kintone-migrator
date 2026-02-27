export type AdminNotesDiffEntry = Readonly<{
  type: "modified";
  field: string;
  details: string;
}>;

export type AdminNotesDiffSummary = Readonly<{
  added: number;
  modified: number;
  deleted: number;
  total: number;
}>;

export type AdminNotesDiff = Readonly<{
  entries: readonly AdminNotesDiffEntry[];
  summary: AdminNotesDiffSummary;
  isEmpty: boolean;
}>;
