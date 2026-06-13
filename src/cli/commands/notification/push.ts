import * as p from "@clack/prompts";
import { createNotificationCliContainer } from "@/core/application/container/notificationCli";
import { pushNotification } from "@/core/application/notification/pushNotification";
import {
  notificationArgs,
  resolveNotificationAppContainerConfig,
  resolveNotificationContainerConfig,
} from "../../notificationConfig";
import { createPushCommand } from "../pushCommandFactory";

export default createPushCommand({
  description:
    "Push the local notification config to kintone (with drift detection)",
  args: notificationArgs,
  subject: "notification config",
  spinnerStopMessage: "Notifications pushed to preview.",
  createContainer: createNotificationCliContainer,
  pushFn: pushNotification,
  toctouMessage:
    "The remote changed while applying. Run `notification pull` and retry.",
  onResult: (result) => {
    if (result.mode === "firstTime") {
      p.log.warn(
        "No base snapshot found. Applied without drift guard and initialized state.",
      );
    }
  },
  resolveContainerConfig: resolveNotificationContainerConfig,
  resolveAppContainerConfig: resolveNotificationAppContainerConfig,
});
