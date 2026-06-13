import type { ThreeWayChange } from "./diff";
import { BusinessRuleError, type BusinessRuleErrorCode } from "./error";

/**
 * Domain-agnostic 3-way merge for single (whole-entity) configs.
 *
 * This is the shared primitive for the single-config domain type (settings /
 * process / admin-notes). Unlike the record-keyed
 * merge ({@link computeRecordThreeWayMerge}), the entire config is one value, so
 * there is exactly one classification:
 *
 * - base→local unchanged && base→remote unchanged → `unchanged`.
 * - only local changed → `localOnly` (take local).
 * - only remote changed → `remoteOnly` (take remote).
 * - both changed to the same value → `bothSame` (no conflict, take local).
 * - both changed to different values → `conflict` (1 conflict).
 *
 * The caller supplies a domain-specific `eq` (the diffDetector's equality
 * logic), so the generic primitive stays unchanged.
 */
export type SingleThreeWayMerge<V> = Readonly<{
  change: ThreeWayChange;
  base: V;
  local: V;
  remote: V;
  /** Auto-merged value; `undefined` when the merge is a conflict. */
  merged?: V;
  hasConflict: boolean;
}>;

/** Classifies a single whole-entity config across base/local/remote. */
export function computeSingleThreeWayMerge<V>(
  base: V,
  local: V,
  remote: V,
  eq: (a: V, b: V) => boolean,
): SingleThreeWayMerge<V> {
  const dl = !eq(base, local);
  const dr = !eq(base, remote);

  let change: ThreeWayChange;
  let merged: V | undefined;
  if (!dl && !dr) {
    change = { kind: "unchanged" };
    merged = base;
  } else if (dl && !dr) {
    change = { kind: "localOnly" };
    merged = local;
  } else if (!dl && dr) {
    change = { kind: "remoteOnly" };
    merged = remote;
  } else if (eq(local, remote)) {
    change = { kind: "bothSame" };
    merged = local;
  } else {
    change = { kind: "conflict" };
    merged = undefined;
  }

  return {
    change,
    base,
    local,
    remote,
    ...(merged !== undefined ? { merged } : {}),
    hasConflict: change.kind === "conflict",
  };
}

/** Resolution of the single conflicting entity: keep local (ours) or remote. */
export type SingleMergeResolution = "local" | "remote" | undefined;

/**
 * Resolves a single-config 3-way merge to one config value.
 *
 * Non-conflicting merges take their auto-merged value; a conflict takes
 * whichever side `resolution` chose. Throws a {@link BusinessRuleError} when a
 * conflict has no resolution — a programmer invariant the application layer
 * translates to a ValidationError.
 */
export function resolveSingleMerge<V>(
  merge: SingleThreeWayMerge<V>,
  resolution: SingleMergeResolution,
  errorCode: BusinessRuleErrorCode,
): V {
  if (merge.change.kind !== "conflict") {
    // merged is defined for every non-conflict classification above.
    return merge.merged as V;
  }
  if (resolution === undefined) {
    throw new BusinessRuleError(errorCode, "Unresolved conflict");
  }
  return resolution === "local" ? merge.local : merge.remote;
}
