import type { NotificationServiceArgs } from "../container/notification";
import { ValidationError, ValidationErrorCode } from "../error";
import { parseNotificationConfigText } from "./parseConfig";

/**
 * Apply notification settings to kintone.
 *
 * Each notification section (general, perRecord, reminder) is updated
 * independently via separate API calls. If one section fails after others
 * have already been applied, the app will be in a partially-updated state.
 * This is a kintone API limitation — there is no transactional update
 * across notification types. Re-running the command is safe and idempotent.
 */
export async function applyNotification({
  container,
}: NotificationServiceArgs): Promise<void> {
  const result = await container.notificationStorage.get();
  if (!result.exists) {
    throw new ValidationError(
      ValidationErrorCode.InvalidInput,
      "Notification config file not found",
    );
  }
  const config = parseNotificationConfigText(result.content);

  if (config.general !== undefined) {
    const currentGeneral =
      await container.notificationConfigurator.getGeneralNotifications();
    await container.notificationConfigurator.updateGeneralNotifications({
      notifyToCommenter: config.general.notifyToCommenter,
      notifications: config.general.notifications,
      revision: currentGeneral.revision,
    });
  }

  if (config.perRecord !== undefined) {
    const currentPerRecord =
      await container.notificationConfigurator.getPerRecordNotifications();
    await container.notificationConfigurator.updatePerRecordNotifications({
      notifications: config.perRecord,
      revision: currentPerRecord.revision,
    });
  }

  if (config.reminder !== undefined) {
    const currentReminder =
      await container.notificationConfigurator.getReminderNotifications();
    await container.notificationConfigurator.updateReminderNotifications({
      timezone: config.reminder.timezone,
      notifications: config.reminder.notifications,
      revision: currentReminder.revision,
    });
  }
}
