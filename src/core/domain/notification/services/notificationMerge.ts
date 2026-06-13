import { classifyThreeWay, type ThreeWayEntry } from "@/core/domain/diff";
import { BusinessRuleError } from "@/core/domain/error";
import {
  computeSingleThreeWayMerge,
  resolveSingleMerge,
  type SingleThreeWayMerge,
} from "@/core/domain/singleMerge";
import { deepEqual } from "@/lib/deepEqual";
import { groupByKey } from "@/lib/groupByKey";
import type {
  GeneralNotification,
  GeneralNotificationConfig,
  NotificationConfig,
  PerRecordNotification,
  ReminderNotification,
  ReminderNotificationConfig,
} from "../entity";
import { NotificationErrorCode } from "../errorCode";

/**
 * 3-way merge for the notification domain (general / perRecord / reminder).
 *
 * The three sub-configs are bundled into one snapshot but each has a different
 * stable-key strategy, taken verbatim from the existing 2-way
 * `NotificationDiffDetector` so the 3-way granularity matches `notification
 * diff` exactly (one entry change = one conflict). Each sub-config is keyed into
 * a `Map` and classified by the generic {@link classifyThreeWay}, with a
 * section-prefixed key so every entry is unique across sections in the unified
 * conflict-resolution namespace:
 *
 * - **reminder** = `code` stable key (`compareReminderSection`, diffDetector
 *   reminder map). Plus the `timezone` scalar as a single whole-entity 3-way.
 * - **perRecord** = group by `filterCond`, then within a group match by index
 *   (`filterCond#i` composite key — `comparePerRecordSection`). `perRecordLabel`
 *   is display-only and is NOT used as a match key.
 * - **general** = entity (`type:code`) keyed list (`compareGeneralSection`) plus
 *   the `notifyToCommenter` scalar as a single whole-entity 3-way, so the scalar
 *   is never dropped from the 3-way.
 */

// --- Section keys (kept stable for conflict resolution / diff labels). ---

const GENERAL_SCALAR_KEY = "general:notifyToCommenter";
const REMINDER_TIMEZONE_KEY = "reminder:timezone";

function generalEntityKey(notif: GeneralNotification): string {
  // ":" is safe: kintone entity types are uppercase alpha and codes do not
  // contain ":", so the serialized form is unambiguous (matches diffDetector).
  return `general:${notif.entity.type}:${notif.entity.code}`;
}

function perRecordCompositeKey(filterCond: string, index: number): string {
  return `perRecord:${filterCond}#${index}`;
}

function reminderKey(notif: ReminderNotification): string {
  return `reminder:${notif.code}`;
}

// --- Equality (matches diffDetector's "no changes" semantics). ---

/**
 * General notification equality, matching `compareGeneralNotification`:
 * `includeSubs` treats `undefined` and `false` as equivalent; the boolean flags
 * are compared directly. The entity is the key and is not compared here.
 */
function isGeneralNotificationEqual(
  a: GeneralNotification,
  b: GeneralNotification,
): boolean {
  return (
    (a.includeSubs ?? false) === (b.includeSubs ?? false) &&
    a.recordAdded === b.recordAdded &&
    a.recordEdited === b.recordEdited &&
    a.commentAdded === b.commentAdded &&
    a.statusChanged === b.statusChanged &&
    a.fileImported === b.fileImported
  );
}

// perRecord / reminder use whole-entry deepEqual, matching the diffDetector's
// `!deepEqual(localNotif, remoteNotif)` "modified" check.
function isPerRecordEqual(
  a: PerRecordNotification,
  b: PerRecordNotification,
): boolean {
  return deepEqual(a, b);
}

function isReminderEqual(
  a: ReminderNotification,
  b: ReminderNotification,
): boolean {
  return deepEqual(a, b);
}

// --- Map builders (mirror diffDetector's key strategy). ---

function buildGeneralMap(
  config: GeneralNotificationConfig | undefined,
): Map<string, GeneralNotification> {
  const map = new Map<string, GeneralNotification>();
  if (!config) {
    return map;
  }
  for (const notif of config.notifications) {
    map.set(generalEntityKey(notif), notif);
  }
  return map;
}

function buildPerRecordMap(
  notifications: readonly PerRecordNotification[] | undefined,
): Map<string, PerRecordNotification> {
  const map = new Map<string, PerRecordNotification>();
  if (!notifications) {
    return map;
  }
  // Group by filterCond, then key by group-local index (filterCond#i), so
  // multiple entries sharing a filterCond match positionally (diffDetector).
  const grouped = groupByKey(notifications, (n) => n.filterCond);
  for (const [filterCond, group] of grouped) {
    group.forEach((notif, i) => {
      map.set(perRecordCompositeKey(filterCond, i), notif);
    });
  }
  return map;
}

function buildReminderMap(
  config: ReminderNotificationConfig | undefined,
): Map<string, ReminderNotification> {
  const map = new Map<string, ReminderNotification>();
  if (!config) {
    return map;
  }
  for (const notif of config.notifications) {
    map.set(reminderKey(notif), notif);
  }
  return map;
}

// --- Aggregate merge. ---

export type NotificationMergeEntry = ThreeWayEntry<string, unknown>;

/**
 * The bundled 3-way merge of the notification config.
 *
 * - `entries`: every keyed entry across the three sections (general/perRecord/
 *   reminder lists), classified by {@link classifyThreeWay}.
 * - `generalScalar` / `reminderTimezone`: whole-entity 3-way of the two scalars
 *   that live outside the keyed lists, so they are never dropped.
 * - `conflicts` / `hasConflict`: the union of conflicts across all of the above,
 *   each carrying a stable section-prefixed key for resolution.
 */
export type NotificationThreeWayMerge = Readonly<{
  entries: readonly NotificationMergeEntry[];
  generalScalar: SingleThreeWayMerge<boolean>;
  reminderTimezone: SingleThreeWayMerge<string>;
  conflicts: readonly { key: string }[];
  hasConflict: boolean;
}>;

function scalarConflictKey(
  scalar: SingleThreeWayMerge<unknown>,
  key: string,
): { key: string }[] {
  return scalar.change.kind === "conflict" ? [{ key }] : [];
}

/** Computes the bundled 3-way merge of base/local/remote notification config. */
export function computeNotificationThreeWayMerge(
  base: NotificationConfig,
  local: NotificationConfig,
  remote: NotificationConfig,
): NotificationThreeWayMerge {
  const general = classifyThreeWay(
    buildGeneralMap(base.general),
    buildGeneralMap(local.general),
    buildGeneralMap(remote.general),
    isGeneralNotificationEqual,
  );
  const perRecord = classifyThreeWay(
    buildPerRecordMap(base.perRecord),
    buildPerRecordMap(local.perRecord),
    buildPerRecordMap(remote.perRecord),
    isPerRecordEqual,
  );
  const reminder = classifyThreeWay(
    buildReminderMap(base.reminder),
    buildReminderMap(local.reminder),
    buildReminderMap(remote.reminder),
    isReminderEqual,
  );

  const generalScalar = computeSingleThreeWayMerge<boolean>(
    base.general?.notifyToCommenter ?? false,
    local.general?.notifyToCommenter ?? false,
    remote.general?.notifyToCommenter ?? false,
    (a, b) => a === b,
  );
  const reminderTimezone = computeSingleThreeWayMerge<string>(
    base.reminder?.timezone ?? "",
    local.reminder?.timezone ?? "",
    remote.reminder?.timezone ?? "",
    (a, b) => a === b,
  );

  const entries: NotificationMergeEntry[] = [
    ...general.entries,
    ...perRecord.entries,
    ...reminder.entries,
  ];

  const conflicts: { key: string }[] = [
    ...general.conflicts.map((e) => ({ key: e.key })),
    ...perRecord.conflicts.map((e) => ({ key: e.key })),
    ...reminder.conflicts.map((e) => ({ key: e.key })),
    ...scalarConflictKey(generalScalar, GENERAL_SCALAR_KEY),
    ...scalarConflictKey(reminderTimezone, REMINDER_TIMEZONE_KEY),
  ];

  return {
    entries,
    generalScalar,
    reminderTimezone,
    conflicts,
    hasConflict: conflicts.length > 0,
  };
}

/** Resolution of a single conflicting key: keep local (ours) or remote (theirs). */
export type NotificationMergeResolution = ReadonlyMap<
  string,
  "local" | "remote"
>;

function resolveEntryValue<V>(
  entry: ThreeWayEntry<string, V>,
  resolution: NotificationMergeResolution,
): V | undefined {
  if (entry.change.kind !== "conflict") {
    return entry.merged;
  }
  const choice = resolution.get(entry.key);
  if (choice === undefined) {
    throw new BusinessRuleError(
      NotificationErrorCode.NtUnresolvedConflict,
      `Unresolved conflict for "${entry.key}"`,
    );
  }
  return choice === "local" ? entry.local : entry.remote;
}

function collectGeneralNotifications(
  entries: readonly NotificationMergeEntry[],
  resolution: NotificationMergeResolution,
): GeneralNotification[] {
  const result: GeneralNotification[] = [];
  for (const entry of entries) {
    if (!entry.key.startsWith("general:") || entry.key === GENERAL_SCALAR_KEY) {
      continue;
    }
    const value = resolveEntryValue(
      entry as ThreeWayEntry<string, GeneralNotification>,
      resolution,
    );
    if (value !== undefined) {
      result.push(value);
    }
  }
  return result;
}

function collectPerRecordNotifications(
  entries: readonly NotificationMergeEntry[],
  resolution: NotificationMergeResolution,
): PerRecordNotification[] {
  const result: PerRecordNotification[] = [];
  for (const entry of entries) {
    if (!entry.key.startsWith("perRecord:")) {
      continue;
    }
    const value = resolveEntryValue(
      entry as ThreeWayEntry<string, PerRecordNotification>,
      resolution,
    );
    if (value !== undefined) {
      result.push(value);
    }
  }
  return result;
}

function collectReminderNotifications(
  entries: readonly NotificationMergeEntry[],
  resolution: NotificationMergeResolution,
): ReminderNotification[] {
  const result: ReminderNotification[] = [];
  for (const entry of entries) {
    if (
      !entry.key.startsWith("reminder:") ||
      entry.key === REMINDER_TIMEZONE_KEY
    ) {
      continue;
    }
    const value = resolveEntryValue(
      entry as ThreeWayEntry<string, ReminderNotification>,
      resolution,
    );
    if (value !== undefined) {
      result.push(value);
    }
  }
  return result;
}

/**
 * Applies a resolved 3-way merge, returning the merged notification config.
 *
 * Reconstructs the three sub-configs from the resolved keyed entries plus the
 * two scalars. The three sections are always emitted (kintone always returns
 * all three sections), so the merged config has `general` / `perRecord` /
 * `reminder` defined even when their lists are empty. Throws a
 * {@link BusinessRuleError} when a conflict is left unresolved (programmer
 * invariant the application layer translates to a ValidationError).
 */
export function resolveNotificationMerge(
  merge: NotificationThreeWayMerge,
  resolution: NotificationMergeResolution,
): NotificationConfig {
  const notifyToCommenter = resolveSingleMerge(
    merge.generalScalar,
    resolution.get(GENERAL_SCALAR_KEY),
    NotificationErrorCode.NtUnresolvedConflict,
  );
  const timezone = resolveSingleMerge(
    merge.reminderTimezone,
    resolution.get(REMINDER_TIMEZONE_KEY),
    NotificationErrorCode.NtUnresolvedConflict,
  );

  return {
    general: {
      notifyToCommenter,
      notifications: collectGeneralNotifications(merge.entries, resolution),
    },
    perRecord: collectPerRecordNotifications(merge.entries, resolution),
    reminder: {
      timezone,
      notifications: collectReminderNotifications(merge.entries, resolution),
    },
  };
}
