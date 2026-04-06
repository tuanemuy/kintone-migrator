import { createNotificationCliContainer } from "@/core/application/container/notificationCli";
import { applyNotification } from "@/core/application/notification/applyNotification";
import { detectNotificationDiff } from "@/core/application/notification/detectNotificationDiff";
import {
  notificationArgs,
  resolveNotificationAppContainerConfig,
  resolveNotificationContainerConfig,
} from "../../notificationConfig";
import { printNotificationDiffResult } from "../../output";
import { createApplyCommand } from "../applyCommandFactory";

export default createApplyCommand({
  description: "Apply notification settings from YAML to kintone app",
  args: notificationArgs,
  spinnerMessage: "Applying notification settings...",
  spinnerStopMessage: "Notification settings applied.",
  successMessage: "Notification settings applied successfully.",
  createContainer: createNotificationCliContainer,
  applyFn: applyNotification,
  diffPreview: {
    detectDiff: detectNotificationDiff,
    printResult: printNotificationDiffResult,
  },
  resolveContainerConfig: resolveNotificationContainerConfig,
  resolveAppContainerConfig: resolveNotificationAppContainerConfig,
});
