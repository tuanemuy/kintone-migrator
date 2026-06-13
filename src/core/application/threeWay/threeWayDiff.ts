import type { ThreeWayEntry } from "@/core/domain/diff";
import type { RecordThreeWayMerge } from "@/core/domain/recordMerge";
import type { SingleThreeWayMerge } from "@/core/domain/singleMerge";

/**
 * One entry of a generic 3-way diff: a stable key, a human label, and which
 * side(s) changed. Domain-agnostic so a single CLI printer
 * (`printThreeWayDiffResult`) renders every config domain.
 */
export type ThreeWayDiffEntry = Readonly<{
  key: string;
  label: string;
  kind: "localOnly" | "remoteOnly" | "conflict";
}>;

/**
 * A domain-specific tail line of the 3-way diff (e.g. schema's whole-`layout`
 * status). `change` covers the both-sides-changed-to-same auto-merge case that
 * record entries never surface (they are dropped as `bothSame`).
 */
export type ThreeWayDiffExtra = Readonly<{
  key: string;
  kind: "localOnly" | "remoteOnly" | "conflict" | "change";
}>;

/**
 * Generic 3-way diff result shared by every config domain.
 *
 * - `three-way`: a state (base snapshot) exists; changes are split into
 *   local-only, remote drift, and conflicts. `extraLines` carries domain-
 *   specific tail lines (e.g. schema's layout status) already formatted.
 * - `two-way`: no state exists; the domain falls back to its existing 2-way
 *   diff, rendered by `render` so the printer stays domain-agnostic.
 */
export type ThreeWayDiffResult<TTwoWay = unknown> =
  | Readonly<{
      mode: "three-way";
      localChanges: readonly ThreeWayDiffEntry[];
      remoteDrift: readonly ThreeWayDiffEntry[];
      conflicts: readonly ThreeWayDiffEntry[];
      /** Domain-specific tail entries appended after the keyed entries. */
      extras: readonly ThreeWayDiffExtra[];
      isEmpty: boolean;
    }>
  | Readonly<{
      mode: "two-way";
      /** The domain's existing 2-way diff, rendered by the CLI fallback. */
      diff: TTwoWay;
    }>;

/**
 * Builds the three-way portion of a {@link ThreeWayDiffResult} from a
 * record-keyed merge (view / report / action / plugin). The caller supplies a
 * `label` extractor (e.g. the view's name) for display.
 */
export function buildRecordThreeWayDiff<V, TTwoWay = unknown>(
  merge: RecordThreeWayMerge<V>,
  label: (entry: ThreeWayEntry<string, V>) => string,
  extras: readonly ThreeWayDiffExtra[] = [],
): ThreeWayDiffResult<TTwoWay> {
  const localChanges: ThreeWayDiffEntry[] = [];
  const remoteDrift: ThreeWayDiffEntry[] = [];
  const conflicts: ThreeWayDiffEntry[] = [];

  for (const entry of merge.entries) {
    switch (entry.change.kind) {
      case "localOnly":
        localChanges.push({
          key: entry.key,
          label: label(entry),
          kind: "localOnly",
        });
        break;
      case "remoteOnly":
        remoteDrift.push({
          key: entry.key,
          label: label(entry),
          kind: "remoteOnly",
        });
        break;
      case "conflict":
        conflicts.push({
          key: entry.key,
          label: label(entry),
          kind: "conflict",
        });
        break;
      default:
        break;
    }
  }

  const isEmpty =
    localChanges.length === 0 &&
    remoteDrift.length === 0 &&
    conflicts.length === 0 &&
    extras.length === 0;

  return {
    mode: "three-way",
    localChanges,
    remoteDrift,
    conflicts,
    extras,
    isEmpty,
  };
}

/**
 * Builds the three-way portion of a {@link ThreeWayDiffResult} from a single
 * whole-entity merge (settings / process / admin-notes). The
 * config is one value, so the merge produces at most one diff entry under a
 * fixed `key` / `label` (e.g. "settings"). `bothSame` / `unchanged` produce no
 * entry (empty diff), matching the record-keyed behaviour.
 */
export function buildSingleThreeWayDiff<V, TTwoWay = unknown>(
  merge: SingleThreeWayMerge<V>,
  key: string,
): ThreeWayDiffResult<TTwoWay> {
  const localChanges: ThreeWayDiffEntry[] = [];
  const remoteDrift: ThreeWayDiffEntry[] = [];
  const conflicts: ThreeWayDiffEntry[] = [];

  const entry: ThreeWayDiffEntry = {
    key,
    label: key,
    kind: "localOnly",
  };
  switch (merge.change.kind) {
    case "localOnly":
      localChanges.push(entry);
      break;
    case "remoteOnly":
      remoteDrift.push({ ...entry, kind: "remoteOnly" });
      break;
    case "conflict":
      conflicts.push({ ...entry, kind: "conflict" });
      break;
    default:
      break;
  }

  const isEmpty =
    localChanges.length === 0 &&
    remoteDrift.length === 0 &&
    conflicts.length === 0;

  return {
    mode: "three-way",
    localChanges,
    remoteDrift,
    conflicts,
    extras: [],
    isEmpty,
  };
}
