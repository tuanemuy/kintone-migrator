import { createNotificationCliContainer } from "@/core/application/container/notificationCli";
import { detectNotificationDiff } from "@/core/application/notification/detectNotificationDiff";
import {
  notificationArgs,
  resolveNotificationAppContainerConfig,
  resolveNotificationContainerConfig,
} from "../../notificationConfig";
import { printNotificationDiffResult } from "../../output";
import { createDiffCommand } from "../diffCommandFactory";

export default createDiffCommand({
  description: "Compare local notification config with remote kintone app",
  args: notificationArgs,
  spinnerMessage: "Comparing notification settings...",
  multiAppSuccessMessage: "All notification diffs completed successfully.",
  createContainer: createNotificationCliContainer,
  detectDiff: detectNotificationDiff,
  printResult: printNotificationDiffResult,
  resolveContainerConfig: resolveNotificationContainerConfig,
  resolveAppContainerConfig: resolveNotificationAppContainerConfig,
});
