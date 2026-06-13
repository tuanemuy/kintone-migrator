import type { ThreeWayEntry } from "@/core/domain/diff";
import { isLayoutEqual } from "@/core/domain/formSchema/services/diffDetector";
import { enrichLayoutWithFields } from "@/core/domain/formSchema/services/layoutEnricher";
import { computeThreeWayMerge } from "@/core/domain/formSchema/services/threeWayMerge";
import type {
  FieldCode,
  FieldDefinition,
} from "@/core/domain/formSchema/valueObject";
import type { FormSchemaDiffServiceArgs } from "../container/formSchema";
import { detectDiff } from "./detectDiff";
import type { DetectThreeWayDiffOutput, ThreeWayDiffFieldEntry } from "./dto";
import { loadThreeWayInputs } from "./loadThreeWayInputs";

function toEntry(
  entry: ThreeWayEntry<FieldCode, FieldDefinition>,
  kind: ThreeWayDiffFieldEntry["kind"],
): ThreeWayDiffFieldEntry {
  const label =
    entry.local?.label ?? entry.remote?.label ?? entry.base?.label ?? "";
  return { fieldCode: entry.key, fieldLabel: label, kind };
}

/**
 * Detects differences with 3-way awareness (AC-10, AC-11).
 *
 * When a state (base snapshot) exists, classifies changes into local-only,
 * remote drift, and conflicts. When no state exists, falls back to the existing
 * 2-way `detectDiff`.
 */
export async function detectThreeWayDiff({
  container,
}: FormSchemaDiffServiceArgs): Promise<DetectThreeWayDiffOutput> {
  const { state, local, remote } = await loadThreeWayInputs(container);

  if (state === undefined || local === undefined) {
    // No state (first run) or local YAML gone: fall back to 2-way diff.
    const diff = await detectDiff({ container });
    return { mode: "two-way", diff };
  }

  const merge = computeThreeWayMerge(state.schema, local, remote);

  const localChanges: ThreeWayDiffFieldEntry[] = [];
  const remoteDrift: ThreeWayDiffFieldEntry[] = [];
  const conflicts: ThreeWayDiffFieldEntry[] = [];
  for (const entry of merge.fieldEntries) {
    switch (entry.change.kind) {
      case "localOnly":
        localChanges.push(toEntry(entry, "localOnly"));
        break;
      case "remoteOnly":
        remoteDrift.push(toEntry(entry, "remoteOnly"));
        break;
      case "conflict":
        conflicts.push(toEntry(entry, "conflict"));
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

  const isEmpty =
    localChanges.length === 0 &&
    remoteDrift.length === 0 &&
    conflicts.length === 0 &&
    !layoutLocalChanged &&
    !layoutRemoteChanged;

  return {
    mode: "three-way",
    localChanges,
    remoteDrift,
    conflicts,
    layoutLocalChanged,
    layoutRemoteChanged,
    layoutConflict: merge.layoutConflict,
    isEmpty,
  };
}
