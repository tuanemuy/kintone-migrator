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

/** How many resource keys a note lists inline before summarizing the rest. */
const MAX_LISTED_KEYS = 10;

/**
 * Renders the affected resource keys so the note identifies its subjects.
 *
 * The counts alone cannot be acted on: neither the diff lines nor `customize
 * push` mark which entries were inferred, so "N file(s)" leaves the user with no
 * way to tell them apart from the exactly-compared ones.
 */
function formatKeys(keys: readonly string[]): string {
  const listed = keys.slice(0, MAX_LISTED_KEYS).join(", ");
  const rest = keys.length - MAX_LISTED_KEYS;
  return rest > 0 ? `${listed}, and ${rest} more` : listed;
}

function optimisticNote(keys: readonly string[]): string {
  return [
    `Base snapshot has no content digest for ${keys.length} file(s); they were classified by assuming the remote still matches the base (app revision unchanged): ${formatKeys(keys)}.`,
    "A normal (non-force) `customize push` or `customize pull` records the baseline. If the remote may have been edited outside this tool, run `customize pull --force` first to take the remote side — that replaces every local customization file and your customization config file with the remote copy, discarding the local edits listed above, so save them elsewhere first.",
  ].join("\n");
}

function conservativeNote(keys: readonly string[]): string {
  return [
    `Base snapshot has no content digest for ${keys.length} file(s); their classification is inferred: ${formatKeys(keys)}.`,
    "Run `customize pull` once (resolve the entries, or use `--ours` / `--theirs`) to record the baseline for files that exist on the remote or can be read from disk. Subsequent runs use exact content comparison for those files.",
  ].join("\n");
}

function unreadableNote(keys: readonly string[]): string {
  return [
    `${keys.length} file(s) declared in the customization config file could not be read from disk, so their content counted as unknown and they are listed as changed: ${formatKeys(keys)}.`,
    "Build or restore those files (or fix the declared paths) and run `customize diff` again to see the real classification.",
  ].join("\n");
}

/**
 * Builds the caveats for keys the classification could not compare exactly:
 * those whose base content was inferred rather than read from the snapshot, and
 * those whose local body was unreadable. Only keys that actually surfaced as a
 * diff line are reported: such a key classified as `unchanged` tells the user
 * nothing, and over-reporting would train them to ignore the note.
 */
function buildNotes(
  estimatedKeys: EstimatedBaseKeys,
  unreadableLocalKeys: ReadonlySet<string>,
  changedKeys: ReadonlySet<string>,
): string[] {
  const changedIn = (keys: ReadonlySet<string>): string[] =>
    [...keys].filter((key) => changedKeys.has(key));

  const notes: string[] = [];
  const optimistic = changedIn(estimatedKeys.optimistic);
  if (optimistic.length > 0) {
    notes.push(optimisticNote(optimistic));
  }
  const conservative = changedIn(estimatedKeys.conservative);
  if (conservative.length > 0) {
    notes.push(conservativeNote(conservative));
  }
  const unreadable = changedIn(unreadableLocalKeys);
  if (unreadable.length > 0) {
    notes.push(unreadableNote(unreadable));
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

  const { merge, estimatedKeys, unreadableLocalKeys } =
    await buildCustomizationThreeWayMerge({
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
    buildNotes(estimatedKeys, unreadableLocalKeys, changedKeys),
  );
}
