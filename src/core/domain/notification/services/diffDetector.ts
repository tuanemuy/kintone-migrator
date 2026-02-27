import { buildDiffResult } from "../../diff";
import type {
  GeneralNotification,
  GeneralNotificationConfig,
  NotificationConfig,
  PerRecordNotification,
  ReminderNotification,
} from "../entity";
import type { NotificationDiffEntry } from "../valueObject";

function serializeEntity(entity: { type: string; code: string }): string {
  return `${entity.type}:${entity.code}`;
}

function compareGeneralNotification(
  local: GeneralNotification,
  remote: GeneralNotification,
): string[] {
  const diffs: string[] = [];
  if (local.includeSubs !== remote.includeSubs) {
    diffs.push(
      `includeSubs: ${String(remote.includeSubs)} -> ${String(local.includeSubs)}`,
    );
  }
  if (local.recordAdded !== remote.recordAdded) {
    diffs.push(
      `recordAdded: ${String(remote.recordAdded)} -> ${String(local.recordAdded)}`,
    );
  }
  if (local.recordEdited !== remote.recordEdited) {
    diffs.push(
      `recordEdited: ${String(remote.recordEdited)} -> ${String(local.recordEdited)}`,
    );
  }
  if (local.commentAdded !== remote.commentAdded) {
    diffs.push(
      `commentAdded: ${String(remote.commentAdded)} -> ${String(local.commentAdded)}`,
    );
  }
  if (local.statusChanged !== remote.statusChanged) {
    diffs.push(
      `statusChanged: ${String(remote.statusChanged)} -> ${String(local.statusChanged)}`,
    );
  }
  if (local.fileImported !== remote.fileImported) {
    diffs.push(
      `fileImported: ${String(remote.fileImported)} -> ${String(local.fileImported)}`,
    );
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

// perRecord notifications are keyed by filterCond. Duplicate filterCond values
// within the same config will cause only the last entry to be compared.
function comparePerRecordSection(
  local: readonly PerRecordNotification[],
  remote: readonly PerRecordNotification[],
): NotificationDiffEntry[] {
  const entries: NotificationDiffEntry[] = [];

  const localMap = new Map(local.map((n) => [n.filterCond, n]));
  const remoteMap = new Map(remote.map((n) => [n.filterCond, n]));

  for (const [key, localNotif] of localMap) {
    const remoteNotif = remoteMap.get(key);
    const label = localNotif.title || key || "(empty filter)";
    if (!remoteNotif) {
      entries.push({
        type: "added",
        section: "perRecord",
        name: label,
        details: "new notification",
      });
    } else if (JSON.stringify(localNotif) !== JSON.stringify(remoteNotif)) {
      entries.push({
        type: "modified",
        section: "perRecord",
        name: label,
        details: "changed",
      });
    }
  }

  for (const [key, remoteNotif] of remoteMap) {
    if (!localMap.has(key)) {
      const label = remoteNotif.title || key || "(empty filter)";
      entries.push({
        type: "deleted",
        section: "perRecord",
        name: label,
        details: "removed",
      });
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
    } else if (JSON.stringify(localNotif) !== JSON.stringify(remoteNotif)) {
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
  detect: (local: NotificationConfig, remote: NotificationConfig) => {
    const entries: NotificationDiffEntry[] = [];

    if (local.general && remote.general) {
      entries.push(...compareGeneralSection(local.general, remote.general));
    } else if (local.general && !remote.general) {
      entries.push({
        type: "modified",
        section: "general",
        name: "general",
        details: "added general notifications section",
      });
    } else if (!local.general && remote.general) {
      entries.push({
        type: "modified",
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
        type: "modified",
        section: "reminder",
        name: "reminder",
        details: "added reminder notifications section",
      });
    } else if (!local.reminder && remote.reminder) {
      entries.push({
        type: "modified",
        section: "reminder",
        name: "reminder",
        details: "removed reminder notifications section",
      });
    }

    return buildDiffResult(entries);
  },
};
