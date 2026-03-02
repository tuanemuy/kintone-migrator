import { serializeToYaml } from "@/core/domain/services/yamlConfigSerializer";
import type {
  GeneralNotification,
  NotificationConfig,
  NotificationTarget,
  PerRecordNotification,
  ReminderNotification,
} from "../entity";
import type { NotificationEntity } from "../valueObject";

function serializeEntity(entity: NotificationEntity): Record<string, unknown> {
  return {
    type: entity.type,
    code: entity.code,
  };
}

function serializeGeneralNotification(
  notification: GeneralNotification,
): Record<string, unknown> {
  const result: Record<string, unknown> = {
    entity: serializeEntity(notification.entity),
    recordAdded: notification.recordAdded,
    recordEdited: notification.recordEdited,
    commentAdded: notification.commentAdded,
    statusChanged: notification.statusChanged,
    fileImported: notification.fileImported,
  };

  if (notification.includeSubs !== undefined) {
    result.includeSubs = notification.includeSubs;
  }

  return result;
}

function serializeTarget(target: NotificationTarget): Record<string, unknown> {
  const result: Record<string, unknown> = {
    entity: serializeEntity(target.entity),
  };

  if (target.includeSubs !== undefined) {
    result.includeSubs = target.includeSubs;
  }

  return result;
}

function serializePerRecordNotification(
  notification: PerRecordNotification,
): Record<string, unknown> {
  return {
    filterCond: notification.filterCond,
    title: notification.title,
    targets: notification.targets.map(serializeTarget),
  };
}

function serializeReminderNotification(
  notification: ReminderNotification,
): Record<string, unknown> {
  const result: Record<string, unknown> = {
    code: notification.code,
    daysLater: notification.daysLater,
    filterCond: notification.filterCond,
    title: notification.title,
    targets: notification.targets.map(serializeTarget),
  };

  if (notification.hoursLater !== undefined) {
    result.hoursLater = notification.hoursLater;
  }

  if (notification.time !== undefined) {
    result.time = notification.time;
  }

  return result;
}

export const NotificationConfigSerializer = {
  serialize: (config: NotificationConfig): string => {
    const serialized: Record<string, unknown> = {};

    if (config.general !== undefined) {
      serialized.general = {
        notifyToCommenter: config.general.notifyToCommenter,
        notifications: config.general.notifications.map(
          serializeGeneralNotification,
        ),
      };
    }

    if (config.perRecord !== undefined) {
      serialized.perRecord = config.perRecord.map(
        serializePerRecordNotification,
      );
    }

    if (config.reminder !== undefined) {
      serialized.reminder = {
        timezone: config.reminder.timezone,
        notifications: config.reminder.notifications.map(
          serializeReminderNotification,
        ),
      };
    }

    return serializeToYaml(serialized);
  },
};
