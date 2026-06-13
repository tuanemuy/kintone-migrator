import type {
  GeneralNotification,
  PerRecordNotification,
  ReminderNotification,
} from "@/core/domain/notification/entity";
import {
  computeNotificationThreeWayMerge,
  type NotificationMergeEntry,
  type NotificationThreeWayMerge,
} from "@/core/domain/notification/services/notificationMerge";
import type { NotificationDiff } from "@/core/domain/notification/valueObject";
import type { SingleThreeWayMerge } from "@/core/domain/singleMerge";
import type { NotificationDiffServiceArgs } from "../container/notification";
import type {
  ThreeWayDiffEntry,
  ThreeWayDiffExtra,
  ThreeWayDiffResult,
} from "../threeWay/threeWayDiff";
import { detectNotificationDiff } from "./detectNotificationDiff";
import { loadNotificationThreeWayInputs } from "./loadNotificationThreeWayInputs";

export type DetectNotificationThreeWayDiffOutput =
  ThreeWayDiffResult<NotificationDiff>;

/**
 * Human label for a merge entry. Uses the section-appropriate display value
 * (`perRecordLabel` semantics for perRecord, `code`/title for reminder, the
 * entity key for general) without affecting the match key.
 */
function entryLabel(entry: NotificationMergeEntry): string {
  const value = entry.local ?? entry.remote ?? entry.base;
  if (entry.key.startsWith("perRecord:")) {
    const n = value as PerRecordNotification | undefined;
    // Mirrors perRecordLabel: title || filterCond || "(empty filter)".
    return n ? n.title || n.filterCond || "(empty filter)" : entry.key;
  }
  if (entry.key.startsWith("reminder:")) {
    const n = value as ReminderNotification | undefined;
    return n ? n.title || n.code : entry.key;
  }
  // general entity list: label by the entity key (type:code), dropping the
  // "general:" namespace prefix.
  const n = value as GeneralNotification | undefined;
  if (n) {
    return `${n.entity.type}:${n.entity.code}`;
  }
  return entry.key.replace(/^general:/, "");
}

function pushScalar(
  scalar: SingleThreeWayMerge<unknown>,
  key: string,
  label: string,
  localChanges: ThreeWayDiffEntry[],
  remoteDrift: ThreeWayDiffEntry[],
  conflicts: ThreeWayDiffEntry[],
  extras: ThreeWayDiffExtra[],
): void {
  switch (scalar.change.kind) {
    case "localOnly":
      localChanges.push({ key, label, kind: "localOnly" });
      break;
    case "remoteOnly":
      remoteDrift.push({ key, label, kind: "remoteOnly" });
      break;
    case "conflict":
      conflicts.push({ key, label, kind: "conflict" });
      break;
    case "bothSame":
      // Both sides changed to the same value: surfaced as an auto-merge line so
      // it is not silently dropped (matches schema's layout `change` extra).
      extras.push({ key, kind: "change" });
      break;
    default:
      break;
  }
}

function buildThreeWay(
  merge: NotificationThreeWayMerge,
): DetectNotificationThreeWayDiffOutput {
  const localChanges: ThreeWayDiffEntry[] = [];
  const remoteDrift: ThreeWayDiffEntry[] = [];
  const conflicts: ThreeWayDiffEntry[] = [];
  const extras: ThreeWayDiffExtra[] = [];

  for (const entry of merge.entries) {
    const base = { key: entry.key, label: entryLabel(entry) };
    switch (entry.change.kind) {
      case "localOnly":
        localChanges.push({ ...base, kind: "localOnly" });
        break;
      case "remoteOnly":
        remoteDrift.push({ ...base, kind: "remoteOnly" });
        break;
      case "conflict":
        conflicts.push({ ...base, kind: "conflict" });
        break;
      default:
        break;
    }
  }

  pushScalar(
    merge.generalScalar,
    "general:notifyToCommenter",
    "notifyToCommenter",
    localChanges,
    remoteDrift,
    conflicts,
    extras,
  );
  pushScalar(
    merge.reminderTimezone,
    "reminder:timezone",
    "timezone",
    localChanges,
    remoteDrift,
    conflicts,
    extras,
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

/**
 * Detects notification differences with 3-way awareness.
 *
 * When a state (base snapshot) exists, classifies changes into local-only,
 * remote drift, and conflicts via the bundled merge (the three sub-configs each
 * keyed by their diffDetector strategy). When no state exists, returns a
 * two-way result carrying the existing 2-way `detectNotificationDiff`, which the
 * CLI renders with its 2-way printer (the 3-way printer stays generic).
 */
export async function detectNotificationThreeWayDiff({
  container,
}: NotificationDiffServiceArgs): Promise<DetectNotificationThreeWayDiffOutput> {
  const { state, local, remote } =
    await loadNotificationThreeWayInputs(container);

  if (state === undefined || local === undefined) {
    const diff = await detectNotificationDiff({ container });
    return { mode: "two-way", diff };
  }

  const merge = computeNotificationThreeWayMerge(state, local, remote.config);
  return buildThreeWay(merge);
}
