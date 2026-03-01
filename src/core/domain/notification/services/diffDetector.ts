import { deepEqual } from "@/lib/deepEqual";
import { groupByKey } from "@/lib/groupByKey";
import { buildDiffResult } from "../../diff";
import type {
  GeneralNotification,
  GeneralNotificationConfig,
  NotificationConfig,
  PerRecordNotification,
  ReminderNotification,
} from "../entity";
import type { NotificationDiff, NotificationDiffEntry } from "../valueObject";

function serializeEntity(entity: { type: string; code: string }): string {
  return `${entity.type}:${entity.code}`;
}

const GENERAL_BOOLEAN_FLAGS = [
  "recordAdded",
  "recordEdited",
  "commentAdded",
  "statusChanged",
  "fileImported",
] as const satisfies readonly (keyof GeneralNotification)[];

function compareGeneralNotification(
  local: GeneralNotification,
  remote: GeneralNotification,
): string[] {
  const diffs: string[] = [];
  // includeSubs needs special handling: undefined and false are equivalent
  if ((local.includeSubs ?? false) !== (remote.includeSubs ?? false)) {
    diffs.push(
      `includeSubs: ${String(remote.includeSubs ?? false)} -> ${String(local.includeSubs ?? false)}`,
    );
  }
  for (const flag of GENERAL_BOOLEAN_FLAGS) {
    if (local[flag] !== remote[flag]) {
      diffs.push(`${flag}: ${String(remote[flag])} -> ${String(local[flag])}`);
    }
  }
  return diffs;
}

function compareGeneralSection(
  local: GeneralNotificationConfig,
  remote: GeneralNotificationConfig,
): NotificationDiffEntry[] {
  const entries: NotificationDiffEntry[] = [];

  if (local.notifyToCommenter !== remote.notifyToCommenter) {
    entries.push({
      type: "modified",
      section: "general",
      name: "notifyToCommenter",
      details: `${String(remote.notifyToCommenter)} -> ${String(local.notifyToCommenter)}`,
    });
  }

  // kintone API guarantees entity keys are unique per notification config, so Map is safe here
  const localMap = new Map(
    local.notifications.map((n) => [serializeEntity(n.entity), n]),
  );
  const remoteMap = new Map(
    remote.notifications.map((n) => [serializeEntity(n.entity), n]),
  );

  for (const [key, localNotif] of localMap) {
    const remoteNotif = remoteMap.get(key);
    if (!remoteNotif) {
      entries.push({
        type: "added",
        section: "general",
        name: key,
        details: "new notification",
      });
    } else {
      const diffs = compareGeneralNotification(localNotif, remoteNotif);
      if (diffs.length > 0) {
        entries.push({
          type: "modified",
          section: "general",
          name: key,
          details: diffs.join(", "),
        });
      }
    }
  }

  for (const key of remoteMap.keys()) {
    if (!localMap.has(key)) {
      entries.push({
        type: "deleted",
        section: "general",
        name: key,
        details: "removed",
      });
    }
  }

  return entries;
}

/**
 * Groups per-record notifications by filterCond. Multiple notifications can share
 * the same filterCond, so notifications within a group are compared by position
 * (index-based matching).
 */
function buildPerRecordMultiMap(
  notifications: readonly PerRecordNotification[],
): Map<string, PerRecordNotification[]> {
  return groupByKey(notifications, (n) => n.filterCond);
}

function perRecordLabel(notif: PerRecordNotification): string {
  // Uses || intentionally: empty strings should fall through to the next option
  // since they carry no meaningful label information for display purposes.
  return notif.title || notif.filterCond || "(empty filter)";
}

function comparePerRecordSection(
  local: readonly PerRecordNotification[],
  remote: readonly PerRecordNotification[],
): NotificationDiffEntry[] {
  const entries: NotificationDiffEntry[] = [];

  const localMulti = buildPerRecordMultiMap(local);
  const remoteMulti = buildPerRecordMultiMap(remote);

  for (const [key, localNotifs] of localMulti) {
    const remoteNotifs = remoteMulti.get(key) ?? [];
    const maxLen = Math.max(localNotifs.length, remoteNotifs.length);

    for (let i = 0; i < maxLen; i++) {
      const localNotif = localNotifs[i];
      const remoteNotif = remoteNotifs[i];

      if (localNotif && !remoteNotif) {
        entries.push({
          type: "added",
          section: "perRecord",
          name: perRecordLabel(localNotif),
          details: "new notification",
        });
      } else if (!localNotif && remoteNotif) {
        entries.push({
          type: "deleted",
          section: "perRecord",
          name: perRecordLabel(remoteNotif),
          details: "removed",
        });
      } else if (
        localNotif &&
        remoteNotif &&
        !deepEqual(localNotif, remoteNotif)
      ) {
        entries.push({
          type: "modified",
          section: "perRecord",
          name: perRecordLabel(localNotif),
          details: "changed",
        });
      }
    }
  }

  for (const [key, remoteNotifs] of remoteMulti) {
    if (!localMulti.has(key)) {
      for (const remoteNotif of remoteNotifs) {
        entries.push({
          type: "deleted",
          section: "perRecord",
          name: perRecordLabel(remoteNotif),
          details: "removed",
        });
      }
    }
  }

  return entries;
}

function compareReminderSection(
  local: readonly ReminderNotification[],
  remote: readonly ReminderNotification[],
): NotificationDiffEntry[] {
  const entries: NotificationDiffEntry[] = [];

  const localMap = new Map(local.map((n) => [n.code, n]));
  const remoteMap = new Map(remote.map((n) => [n.code, n]));

  for (const [code, localNotif] of localMap) {
    const remoteNotif = remoteMap.get(code);
    if (!remoteNotif) {
      entries.push({
        type: "added",
        section: "reminder",
        name: code,
        details: `"${localNotif.title}"`,
      });
    } else if (!deepEqual(localNotif, remoteNotif)) {
      entries.push({
        type: "modified",
        section: "reminder",
        name: code,
        details: "changed",
      });
    }
  }

  for (const code of remoteMap.keys()) {
    if (!localMap.has(code)) {
      entries.push({
        type: "deleted",
        section: "reminder",
        name: code,
        details: "removed",
      });
    }
  }

  return entries;
}

export const NotificationDiffDetector = {
  detect: (
    local: NotificationConfig,
    remote: NotificationConfig,
  ): NotificationDiff => {
    const entries: NotificationDiffEntry[] = [];

    // Section-level additions/deletions use the same "added"/"deleted" type as
    // individual entry changes. This means the summary counts mix section-level
    // and entry-level granularities (e.g. adding a general section + one perRecord
    // entry = +2 added). This is intentional: sections are atomic units that map
    // to kintone API config blocks, and treating them as regular diff entries
    // keeps the output model simple without requiring a separate hierarchy.
    if (local.general && remote.general) {
      entries.push(...compareGeneralSection(local.general, remote.general));
    } else if (local.general && !remote.general) {
      entries.push({
        type: "added",
        section: "general",
        name: "general",
        details: "added general notifications section",
      });
    } else if (!local.general && remote.general) {
      entries.push({
        type: "deleted",
        section: "general",
        name: "general",
        details: "removed general notifications section",
      });
    }

    const localPerRecord = local.perRecord ?? [];
    const remotePerRecord = remote.perRecord ?? [];
    entries.push(...comparePerRecordSection(localPerRecord, remotePerRecord));

    if (local.reminder && remote.reminder) {
      entries.push(
        ...compareReminderSection(
          local.reminder.notifications,
          remote.reminder.notifications,
        ),
      );
      if (local.reminder.timezone !== remote.reminder.timezone) {
        entries.push({
          type: "modified",
          section: "reminder",
          name: "timezone",
          details: `${remote.reminder.timezone} -> ${local.reminder.timezone}`,
        });
      }
    } else if (local.reminder && !remote.reminder) {
      entries.push({
        type: "added",
        section: "reminder",
        name: "reminder",
        details: "added reminder notifications section",
      });
    } else if (!local.reminder && remote.reminder) {
      entries.push({
        type: "deleted",
        section: "reminder",
        name: "reminder",
        details: "removed reminder notifications section",
      });
    }

    return buildDiffResult(entries);
  },
};
