import type { NotificationConfig } from "@/core/domain/notification/entity";
import { NotificationDiffDetector } from "@/core/domain/notification/services/diffDetector";
import type { NotificationDiff } from "@/core/domain/notification/valueObject";
import type { NotificationServiceArgs } from "../container/notification";
import { ValidationError, ValidationErrorCode } from "../error";
import { parseNotificationConfigText } from "./parseConfig";

export async function detectNotificationDiff({
  container,
}: NotificationServiceArgs): Promise<NotificationDiff> {
  const result = await container.notificationStorage.get();
  if (!result.exists) {
    throw new ValidationError(
      ValidationErrorCode.InvalidInput,
      "Notification config file not found",
    );
  }
  const localConfig = parseNotificationConfigText(result.content);

  const [generalResult, perRecordResult, reminderResult] = await Promise.all([
    container.notificationConfigurator.getGeneralNotifications(),
    container.notificationConfigurator.getPerRecordNotifications(),
    container.notificationConfigurator.getReminderNotifications(),
  ]);

  // The kintone API always returns all three sections (general, perRecord, reminder)
  // even when they are empty (empty arrays / default values). This matches the
  // NotificationConfig shape and lets the detector compare sections consistently.
  const remoteConfig: NotificationConfig = {
    general: {
      notifyToCommenter: generalResult.notifyToCommenter,
      notifications: generalResult.notifications,
    },
    perRecord: perRecordResult.notifications,
    reminder: {
      timezone: reminderResult.timezone,
      notifications: reminderResult.notifications,
    },
  };

  return NotificationDiffDetector.detect(localConfig, remoteConfig);
}
