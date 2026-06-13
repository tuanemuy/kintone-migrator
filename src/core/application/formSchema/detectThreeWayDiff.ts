import { isLayoutEqual } from "@/core/domain/formSchema/services/diffDetector";
import { enrichLayoutWithFields } from "@/core/domain/formSchema/services/layoutEnricher";
import { computeThreeWayMerge } from "@/core/domain/formSchema/services/threeWayMerge";
import type { FormSchemaDiffServiceArgs } from "../container/formSchema";
import type {
  ThreeWayDiffEntry,
  ThreeWayDiffExtra,
  ThreeWayDiffResult,
} from "../threeWay/threeWayDiff";
import { detectDiff } from "./detectDiff";
import type { DetectDiffOutput } from "./dto";
import { loadThreeWayInputs } from "./loadThreeWayInputs";

export type DetectSchemaThreeWayDiffOutput =
  ThreeWayDiffResult<DetectDiffOutput>;

/**
 * Detects differences with 3-way awareness (AC-10, AC-11).
 *
 * When a state (base snapshot) exists, classifies field changes into
 * local-only, remote drift, and conflicts and appends the layout status as a
 * domain-specific extra entry. When no state exists, returns a two-way result
 * carrying the existing 2-way `detectDiff`, which the CLI renders via its
 * 2-way printer (the 3-way printer stays domain-agnostic — AC-2).
 */
export async function detectThreeWayDiff({
  container,
}: FormSchemaDiffServiceArgs): Promise<DetectSchemaThreeWayDiffOutput> {
  const { state, local, remote } = await loadThreeWayInputs(container);

  if (state === undefined || local === undefined) {
    // No state (first run) or local YAML gone: fall back to 2-way diff.
    const diff = await detectDiff({ container });
    return { mode: "two-way", diff };
  }

  const merge = computeThreeWayMerge(state.schema, local, remote);

  const localChanges: ThreeWayDiffEntry[] = [];
  const remoteDrift: ThreeWayDiffEntry[] = [];
  const conflicts: ThreeWayDiffEntry[] = [];
  for (const entry of merge.fieldEntries) {
    const label =
      entry.local?.label ?? entry.remote?.label ?? entry.base?.label ?? "";
    switch (entry.change.kind) {
      case "localOnly":
        localChanges.push({ key: entry.key, label, kind: "localOnly" });
        break;
      case "remoteOnly":
        remoteDrift.push({ key: entry.key, label, kind: "remoteOnly" });
        break;
      case "conflict":
        conflicts.push({ key: entry.key, label, kind: "conflict" });
        break;
      default:
        break;
    }
  }

  const enrichedBaseLayout = enrichLayoutWithFields(
    state.schema.layout,
    state.schema.fields,
  );
  const layoutLocalChanged = !isLayoutEqual(
    enrichedBaseLayout,
    merge.localLayout,
  );
  const layoutRemoteChanged = !isLayoutEqual(
    enrichedBaseLayout,
    merge.remoteLayout,
  );

  const extras = buildLayoutExtras(
    merge.layoutConflict,
    layoutLocalChanged,
    layoutRemoteChanged,
  );

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

// The schema-specific whole-`layout` status as a 3-way diff extra entry.
function buildLayoutExtras(
  layoutConflict: boolean,
  layoutLocalChanged: boolean,
  layoutRemoteChanged: boolean,
): ThreeWayDiffExtra[] {
  if (layoutConflict) {
    return [{ key: "layout", kind: "conflict" }];
  }
  if (layoutLocalChanged && !layoutRemoteChanged) {
    return [{ key: "layout", kind: "localOnly" }];
  }
  if (layoutRemoteChanged && !layoutLocalChanged) {
    return [{ key: "layout", kind: "remoteOnly" }];
  }
  if (layoutLocalChanged && layoutRemoteChanged) {
    // Both changed to the same value (auto-merged); still report as changed.
    return [{ key: "layout", kind: "change" }];
  }
  return [];
}
