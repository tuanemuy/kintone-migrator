import { isRecord } from "./typeGuards";

function isArrayEqual(a: unknown, b: unknown): boolean {
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (!deepEqual(a[i], b[i])) return false;
  }
  return true;
}

function isRecordEqual(
  a: Record<string, unknown>,
  b: Record<string, unknown>,
): boolean {
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const key of keysA) {
    if (!Object.hasOwn(b, key)) return false;
    if (!deepEqual(a[key], b[key])) return false;
  }
  return true;
}

export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null) return a === b;
  if (typeof a !== typeof b) return false;
  if (Array.isArray(a)) return isArrayEqual(a, b);
  if (isRecord(a) && isRecord(b)) {
    return isRecordEqual(a, b);
  }
  return false;
}

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
