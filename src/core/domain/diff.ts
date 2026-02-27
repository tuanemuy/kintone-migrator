export type DiffSummary = Readonly<{
  added: number;
  modified: number;
  deleted: number;
  total: number;
}>;

export type DiffResult<E> = Readonly<{
  entries: readonly E[];
  summary: DiffSummary;
  isEmpty: boolean;
}>;

export function buildDiffResult<E extends { type: string }>(
  entries: E[],
): DiffResult<E> {
  const added = entries.filter((e) => e.type === "added").length;
  const modified = entries.filter((e) => e.type === "modified").length;
  const deleted = entries.filter((e) => e.type === "deleted").length;
  return {
    entries,
    summary: { added, modified, deleted, total: added + modified + deleted },
    isEmpty: entries.length === 0,
  };
}
