import { createNotificationCliContainer } from "@/core/application/container/notificationCli";
import { captureNotification } from "@/core/application/notification/captureNotification";
import { saveNotification } from "@/core/application/notification/saveNotification";
import {
  notificationArgs,
  resolveNotificationAppContainerConfig,
  resolveNotificationContainerConfig,
} from "../../notificationConfig";
import { createCaptureCommand } from "../captureCommandFactory";

export default createCaptureCommand({
  description: "Capture current notification settings from kintone app to file",
  args: notificationArgs,
  spinnerMessage: "Capturing notification settings...",
  spinnerStopMessage: "Notification settings captured.",
  domainLabel: "Notification settings",
  multiAppSuccessMessage: "All notification captures completed successfully.",
  createContainer: createNotificationCliContainer,
  captureFn: captureNotification,
  saveFn: saveNotification,
  getConfigFilePath: (config) => config.notificationFilePath,
  resolveContainerConfig: resolveNotificationContainerConfig,
  resolveAppContainerConfig: resolveNotificationAppContainerConfig,
});
