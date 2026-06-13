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
    warnings: readonly string[];
  }>;

const typeOrder: Record<"added" | "modified" | "deleted", number> = {
  added: 0,
  modified: 1,
  deleted: 2,
};

export function buildDiffResult<
  E extends { type: "added" | "modified" | "deleted" },
>(entries: readonly E[], warnings: readonly string[] = []): DiffResult<E> {
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
    warnings,
  };
}

// --- Generic 3-way merge primitive (domain-agnostic) ---

/**
 * Classification of how a single entity changed across base/local/remote.
 *
 * - `unchanged`: neither local nor remote diverged from base.
 * - `localOnly`: only local diverged from base (remote == base).
 * - `remoteOnly`: only remote diverged from base (local == base).
 * - `bothSame`: both diverged from base but to the same value (no conflict).
 * - `conflict`: both diverged from base to different values.
 *
 * Existence/non-existence is treated as a value (sentinel), so additions and
 * deletions are represented naturally (e.g. both-side deletion = `bothSame`).
 */
export type ThreeWayChange =
  | { kind: "unchanged" }
  | { kind: "localOnly" }
  | { kind: "remoteOnly" }
  | { kind: "bothSame" }
  | { kind: "conflict" };

/** Result of classifying a single key across base/local/remote. */
export type ThreeWayEntry<K, V> = Readonly<{
  key: K;
  change: ThreeWayChange;
  base?: V;
  local?: V;
  remote?: V;
  /** Auto-merged value; `undefined` when the entry is a conflict. */
  merged?: V;
}>;

export type ThreeWayMergeResult<K, V> = Readonly<{
  entries: readonly ThreeWayEntry<K, V>[];
  conflicts: readonly ThreeWayEntry<K, V>[];
  hasConflict: boolean;
}>;

/**
 * Classifies every key present in any of base/local/remote into a 3-way change.
 *
 * Pure and domain-agnostic: the caller supplies the equality function `eq`
 * and the value type `V`. Presence/absence of a key is treated as a value, so
 * `eq` is only ever called with two defined values; an `undefined` on one side
 * (absence) compared to a defined value (presence) is always "changed".
 */
export function classifyThreeWay<K, V>(
  base: ReadonlyMap<K, V>,
  local: ReadonlyMap<K, V>,
  remote: ReadonlyMap<K, V>,
  eq: (a: V, b: V) => boolean,
): ThreeWayMergeResult<K, V> {
  const keys = new Set<K>([...base.keys(), ...local.keys(), ...remote.keys()]);
  const entries: ThreeWayEntry<K, V>[] = [];
  const conflicts: ThreeWayEntry<K, V>[] = [];

  const sidesEqual = (a: V | undefined, b: V | undefined): boolean => {
    if (a === undefined && b === undefined) return true;
    if (a === undefined || b === undefined) return false;
    return eq(a, b);
  };

  for (const key of keys) {
    const baseValue = base.get(key);
    const localValue = local.get(key);
    const remoteValue = remote.get(key);

    const dl = !sidesEqual(baseValue, localValue);
    const dr = !sidesEqual(baseValue, remoteValue);

    let change: ThreeWayChange;
    let merged: V | undefined;
    if (!dl && !dr) {
      change = { kind: "unchanged" };
      merged = baseValue;
    } else if (dl && !dr) {
      change = { kind: "localOnly" };
      merged = localValue;
    } else if (!dl && dr) {
      change = { kind: "remoteOnly" };
      merged = remoteValue;
    } else if (sidesEqual(localValue, remoteValue)) {
      change = { kind: "bothSame" };
      merged = localValue;
    } else {
      change = { kind: "conflict" };
      merged = undefined;
    }

    const entry: ThreeWayEntry<K, V> = {
      key,
      change,
      ...(baseValue !== undefined ? { base: baseValue } : {}),
      ...(localValue !== undefined ? { local: localValue } : {}),
      ...(remoteValue !== undefined ? { remote: remoteValue } : {}),
      ...(merged !== undefined ? { merged } : {}),
    };
    entries.push(entry);
    if (change.kind === "conflict") {
      conflicts.push(entry);
    }
  }

  return {
    entries,
    conflicts,
    hasConflict: conflicts.length > 0,
  };
}
