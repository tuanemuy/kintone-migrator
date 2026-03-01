export type DiffSummary = Readonly<{
  added: number;
  modified: number;
  deleted: number;
  total: number;
}>;

export type DiffResult<E extends { type: "added" | "modified" | "deleted" }> =
  Readonly<{
    entries: readonly E[];
    summary: DiffSummary;
    isEmpty: boolean;
  }>;

const typeOrder: Record<"added" | "modified" | "deleted", number> = {
  added: 0,
  modified: 1,
  deleted: 2,
};

export function buildDiffResult<
  E extends { type: "added" | "modified" | "deleted" },
>(entries: readonly E[]): DiffResult<E> {
  const sorted = [...entries].sort(
    (a, b) => typeOrder[a.type] - typeOrder[b.type],
  );
  let added = 0;
  let modified = 0;
  let deleted = 0;
  for (const e of sorted) {
    if (e.type === "added") added++;
    else if (e.type === "modified") modified++;
    else deleted++;
  }
  return {
    entries: sorted,
    summary: { added, modified, deleted, total: sorted.length },
    isEmpty: sorted.length === 0,
  };
}
