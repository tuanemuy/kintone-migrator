import type { NotificationConfig } from "@/core/domain/notification/entity";
import type { NotificationDiffContainer } from "../container/notification";

/** Remote notification config carrying the revision it was observed at. */
export type NotificationRemote = Readonly<{
  config: NotificationConfig;
  revision: string;
}>;

/**
 * Fetches the three remote sub-configs (general / perRecord / reminder) and
 * bundles them into a single {@link NotificationRemote}.
 *
 * The three getters each carry the app (preview) revision; since the revision is
 * app-scoped and the three are fetched at (essentially) the same moment, the
 * general getter's revision is used as the observed remote revision for the
 * TOCTOU guard. kintone always returns all three sections, so the bundled config
 * always has `general` / `perRecord` / `reminder` defined (an unset reminder
 * timezone stays absent).
 */
export async function loadNotificationRemote(
  container: NotificationDiffContainer,
): Promise<NotificationRemote> {
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
      ...(reminder.timezone !== undefined
        ? { timezone: reminder.timezone }
        : {}),
      notifications: reminder.notifications,
    },
  };

  return { config, revision: general.revision };
}
