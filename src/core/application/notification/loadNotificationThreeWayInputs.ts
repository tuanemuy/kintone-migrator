import type { NotificationConfig } from "@/core/domain/notification/entity";
import { NotificationStateParser } from "@/core/domain/notification/services/notificationStateParser";
import type { NotificationDiffContainer } from "../container/notification";
import {
  loadThreeWayInputs,
  type ThreeWayInputs,
} from "../threeWay/loadThreeWayInputs";
import { parseNotificationConfigText } from "./parseConfig";

/** Remote notification config carrying the revision it was observed at. */
export type NotificationRemote = Readonly<{
  config: NotificationConfig;
  revision: string;
}>;

export type NotificationThreeWayInputs = ThreeWayInputs<
  NotificationConfig,
  NotificationRemote
>;

/**
 * Fetches the three remote sub-configs (general / perRecord / reminder) and
 * bundles them into a single {@link NotificationRemote}.
 *
 * The three getters each carry the app (preview) revision; since the revision is
 * app-scoped and the three are fetched at (essentially) the same moment, the
 * general getter's revision is used as the observed remote revision for the
 * TOCTOU guard. kintone always returns all three sections, so the bundled config
 * always has `general` / `perRecord` / `reminder` defined.
 */
async function loadNotificationRemote(
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
      timezone: reminder.timezone,
      notifications: reminder.notifications,
    },
  };

  return { config, revision: general.revision };
}

/**
 * Loads the four inputs of a 3-way notification sync (base snapshot, base app
 * revision, local YAML, remote config + revision) via the generic
 * {@link loadThreeWayInputs}. Notification bundles three sub-configs into one
 * snapshot but shares a single app revision, so it
 * loads thinly on top of the generic helper with a custom `loadRemote` that
 * fans out to the three getters.
 */
export async function loadNotificationThreeWayInputs(
  container: NotificationDiffContainer,
): Promise<NotificationThreeWayInputs> {
  return loadThreeWayInputs<NotificationConfig, NotificationRemote>({
    codec: container.configCodec,
    stateStorage: container.notificationStateStorage,
    appRevisionStorage: container.appRevisionStorage,
    parseState: (parsed) => NotificationStateParser.parse(parsed).config,
    stateLabel: "Notification state",
    loadLocal: async () => {
      const result = await container.notificationStorage.get();
      if (!result.exists) {
        return undefined;
      }
      return parseNotificationConfigText(container.configCodec, result.content);
    },
    loadRemote: async () => loadNotificationRemote(container),
  });
}
