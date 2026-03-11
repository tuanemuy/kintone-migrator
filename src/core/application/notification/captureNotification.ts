import type { NotificationConfig } from "@/core/domain/notification/entity";
import { NotificationConfigSerializer } from "@/core/domain/notification/services/configSerializer";
import type { NotificationServiceArgs } from "../container/notification";
import { stringifyToYaml } from "../stringifyToYaml";

export type CaptureNotificationOutput = {
  readonly configText: string;
  readonly hasExistingConfig: boolean;
};

export async function captureNotification({
  container,
}: NotificationServiceArgs): Promise<CaptureNotificationOutput> {
  const [general, perRecord, reminder] = await Promise.all([
    container.notificationConfigurator.getGeneralNotifications(),
    container.notificationConfigurator.getPerRecordNotifications(),
    container.notificationConfigurator.getReminderNotifications(),
  ]);

  const config: NotificationConfig = {
    general: {
      notifyToCommenter: general.notifyToCommenter,
      notifications: general.notifications,
    },
    perRecord: perRecord.notifications,
    reminder: {
      timezone: reminder.timezone,
      notifications: reminder.notifications,
    },
  };

  const configText = stringifyToYaml(
    NotificationConfigSerializer.serialize(config),
  );
  const existing = await container.notificationStorage.get();

  return {
    configText,
    hasExistingConfig: existing.exists,
  };
}
