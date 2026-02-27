import { buildDiffResult, deepEqual } from "../../diff";
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

function buildPerRecordMultiMap(
  notifications: readonly PerRecordNotification[],
): Map<string, PerRecordNotification[]> {
  const map = new Map<string, PerRecordNotification[]>();
  for (const n of notifications) {
    const existing = map.get(n.filterCond);
    if (existing) {
      existing.push(n);
    } else {
      map.set(n.filterCond, [n]);
    }
  }
  return map;
}

function perRecordLabel(notif: PerRecordNotification): string {
  return notif.title ?? (notif.filterCond || "(empty filter)");
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
