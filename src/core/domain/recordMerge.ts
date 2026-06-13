import {
  classifyThreeWay,
  type ThreeWayEntry,
  type ThreeWayMergeResult,
} from "./diff";
import { BusinessRuleError, type BusinessRuleErrorCode } from "./error";

/**
 * Domain-agnostic 3-way merge for record-keyed configs (`Record<string, V>`).
 *
 * This is the shared primitive for the record-keyed domain type (view / report
 * / action / plugin). Each side is a `Record<name, V>`; entries are classified
 * key-by-key via {@link classifyThreeWay}. The caller supplies a domain-specific
 * `eq` (the diffDetector's equality logic), so the generic `diff.ts` primitive
 * stays unchanged.
 */
export type RecordThreeWayMerge<V> = ThreeWayMergeResult<string, V>;

function toMap<V>(record: Readonly<Record<string, V>>): Map<string, V> {
  return new Map(Object.entries(record));
}

/** Computes the record-keyed 3-way merge of base/local/remote. */
export function computeRecordThreeWayMerge<V>(
  base: Readonly<Record<string, V>>,
  local: Readonly<Record<string, V>>,
  remote: Readonly<Record<string, V>>,
  eq: (a: V, b: V) => boolean,
): RecordThreeWayMerge<V> {
  return classifyThreeWay(toMap(base), toMap(local), toMap(remote), eq);
}

/** Resolution of a single conflicting key: keep local (ours) or remote (theirs). */
export type RecordMergeResolution = ReadonlyMap<string, "local" | "remote">;

/**
 * Applies a resolved 3-way merge to a flat `Record<string, V>`.
 *
 * Auto-merged (non-conflict) entries take their `merged` value; conflicting
 * entries take whichever side the resolution chose. Deletions are represented
 * by the absence of a value, so an entry whose chosen/merged value is
 * `undefined` is dropped from the result.
 *
 * Throws a {@link BusinessRuleError} when a conflict has no resolution — a
 * programmer invariant the application layer translates to a ValidationError.
 */
export function resolveRecordMerge<V>(
  merge: RecordThreeWayMerge<V>,
  resolution: RecordMergeResolution,
  errorCode: BusinessRuleErrorCode,
): Record<string, V> {
  const result: Record<string, V> = {};
  for (const entry of merge.entries) {
    const value = resolveEntry(entry, resolution, errorCode);
    if (value !== undefined) {
      result[entry.key] = value;
    }
  }
  return result;
}

function resolveEntry<V>(
  entry: ThreeWayEntry<string, V>,
  resolution: RecordMergeResolution,
  errorCode: BusinessRuleErrorCode,
): V | undefined {
  if (entry.change.kind !== "conflict") {
    return entry.merged;
  }
  const choice = resolution.get(entry.key);
  if (choice === undefined) {
    throw new BusinessRuleError(
      errorCode,
      `Unresolved conflict for "${entry.key}"`,
    );
  }
  return choice === "local" ? entry.local : entry.remote;
}
