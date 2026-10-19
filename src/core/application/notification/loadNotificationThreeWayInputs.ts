import type { NotificationConfig } from "@/core/domain/notification/entity";
import { NotificationStateParser } from "@/core/domain/notification/services/notificationStateParser";
import type { NotificationDiffContainer } from "../container/notification";
import {
  loadThreeWayInputs,
  type ThreeWayInputs,
} from "../threeWay/loadThreeWayInputs";
import {
  loadNotificationRemote,
  type NotificationRemote,
} from "./loadNotificationRemote";
import { parseNotificationConfigText } from "./parseConfig";

export type NotificationThreeWayInputs = ThreeWayInputs<
  NotificationConfig,
  NotificationRemote
>;

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
