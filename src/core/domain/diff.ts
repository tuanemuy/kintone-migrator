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
>(entries: E[]): DiffResult<E> {
  const sorted = [...entries].sort(
    (a, b) => typeOrder[a.type] - typeOrder[b.type],
  );
  const summary = sorted.reduce(
    (acc, e) => {
      acc[e.type]++;
      return acc;
    },
    { added: 0, modified: 0, deleted: 0 },
  );
  return {
    entries: sorted,
    summary: { ...summary, total: sorted.length },
    isEmpty: sorted.length === 0,
  };
}
