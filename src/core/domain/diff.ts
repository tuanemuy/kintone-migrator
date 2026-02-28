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

const typeOrder: Record<string, number> = {
  added: 0,
  modified: 1,
  deleted: 2,
};

export function buildDiffResult<
  E extends { type: "added" | "modified" | "deleted" },
>(entries: E[]): DiffResult<E> {
  const sorted = [...entries].sort(
    (a, b) => (typeOrder[a.type] ?? 3) - (typeOrder[b.type] ?? 3),
  );
  const added = sorted.filter((e) => e.type === "added").length;
  const modified = sorted.filter((e) => e.type === "modified").length;
  const deleted = sorted.filter((e) => e.type === "deleted").length;
  return {
    entries: sorted,
    summary: { added, modified, deleted, total: added + modified + deleted },
    isEmpty: sorted.length === 0,
  };
}
