import type { EstimatedBaseKeys } from "@/core/domain/customization/services/customizationMerge";
import type { CustomizationDiff } from "@/core/domain/customization/valueObject";
import type { CustomizationThreeWayServiceArgs } from "../container/customization";
import {
  buildRecordThreeWayDiff,
  type ThreeWayDiffResult,
} from "../threeWay/threeWayDiff";
import { buildCustomizationThreeWayMerge } from "./customizationThreeWayMerge";
import { detectCustomizationDiff } from "./detectCustomizationDiff";
import { loadCustomizationThreeWayInputs } from "./loadCustomizationThreeWayInputs";

export type DetectCustomizationThreeWayDiffOutput =
  ThreeWayDiffResult<CustomizationDiff>;

export type DetectCustomizationThreeWayDiffInput = {
  readonly basePath: string;
};

function optimisticNote(count: number): string {
  return [
    `Base snapshot has no content digest for ${count} file(s); they were classified by assuming the remote still matches the base (app revision unchanged).`,
    "A normal (non-force) `customize push` or `customize pull` records the baseline. If the remote may have been edited outside this tool, run `customize pull --force` first to take the remote side.",
  ].join("\n");
}

function conservativeNote(count: number): string {
  return [
    `Base snapshot has no content digest for ${count} file(s); their classification is inferred.`,
    "Run `customize pull` once (resolve the entries, or use `--ours` / `--theirs`) to record the baseline for files that exist on the remote or can be read from disk. Subsequent runs use exact content comparison for those files.",
  ].join("\n");
}

/**
 * Builds the caveats for keys whose base content was inferred rather than read
 * from the snapshot. Only keys that actually surfaced as a diff line are
 * counted: an inferred key classified as `unchanged` tells the user nothing, and
 * over-reporting would train them to ignore the note.
 */
function buildNotes(
  estimatedKeys: EstimatedBaseKeys,
  changedKeys: ReadonlySet<string>,
): string[] {
  const countIn = (keys: ReadonlySet<string>): number =>
    [...keys].filter((key) => changedKeys.has(key)).length;

  const notes: string[] = [];
  const optimistic = countIn(estimatedKeys.optimistic);
  if (optimistic > 0) {
    notes.push(optimisticNote(optimistic));
  }
  const conservative = countIn(estimatedKeys.conservative);
  if (conservative > 0) {
    notes.push(conservativeNote(conservative));
  }
  return notes;
}

/**
 * Detects customization differences with 3-way awareness.
 *
 * When a state (base snapshot) exists, classifies changes into local-only,
 * remote drift, and conflicts via the resource-key-keyed merge, comparing FILE
 * contents by digest against the base snapshot. When no state exists, falls back
 * to the existing 2-way `detectCustomizationDiff` (the CLI renders it with its
 * 2-way printer).
 */
export async function detectCustomizationThreeWayDiff({
  container,
  input,
}: CustomizationThreeWayServiceArgs<DetectCustomizationThreeWayDiffInput>): Promise<DetectCustomizationThreeWayDiffOutput> {
  const { state, baseRevision, local, remote } =
    await loadCustomizationThreeWayInputs(container);

  if (state === undefined || local === undefined) {
    const diff = await detectCustomizationDiff({
      container,
      input: { basePath: input.basePath },
    });
    return { mode: "two-way", diff };
  }

  const { merge, estimatedKeys } = await buildCustomizationThreeWayMerge({
    container,
    state,
    baseRevision,
    local,
    remote,
    basePath: input.basePath,
  });

  const changedKeys = new Set(
    merge.entries
      .filter(
        (entry) =>
          entry.change.kind === "localOnly" ||
          entry.change.kind === "remoteOnly" ||
          entry.change.kind === "conflict",
      )
      .map((entry) => entry.key),
  );

  // The merge key (`platform:category:name` / `config:scope`) is also the label.
  return buildRecordThreeWayDiff(
    merge,
    (entry) => entry.key,
    [],
    buildNotes(estimatedKeys, changedKeys),
  );
}
