import { createNotificationCliContainer } from "@/core/application/container/notificationCli";
import { applyNotification } from "@/core/application/notification/applyNotification";
import {
  notificationArgs,
  resolveNotificationAppContainerConfig,
  resolveNotificationContainerConfig,
} from "../../notificationConfig";
import { createApplyCommand } from "../applyCommandFactory";

export default createApplyCommand({
  description: "Apply notification settings from YAML to kintone app",
  args: notificationArgs,
  spinnerMessage: "Applying notification settings...",
  spinnerStopMessage: "Notification settings applied.",
  successMessage: "Notification settings applied successfully.",
  createContainer: createNotificationCliContainer,
  applyFn: applyNotification,
  resolveContainerConfig: resolveNotificationContainerConfig,
  resolveAppContainerConfig: resolveNotificationAppContainerConfig,
});
