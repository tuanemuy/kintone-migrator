import * as p from "@clack/prompts";
import { define } from "gunshi";
import pc from "picocolors";
import {
  createNotificationCliContainer,
  type NotificationCliContainerConfig,
} from "@/core/application/container/notification";
import { captureNotification } from "@/core/application/notification/captureNotification";
import { saveNotification } from "@/core/application/notification/saveNotification";
import { handleCliError } from "../../handleError";
import {
  type NotificationCliValues,
  notificationArgs,
  resolveNotificationAppContainerConfig,
  resolveNotificationContainerConfig,
} from "../../notificationConfig";
import { printAppHeader } from "../../output";
import { routeMultiApp, runMultiAppWithFailCheck } from "../../projectConfig";

async function runCaptureNotification(
  config: NotificationCliContainerConfig,
): Promise<void> {
  const container = createNotificationCliContainer(config);

  const s = p.spinner();
  s.start("Capturing notification settings...");
  const result = await captureNotification({ container });
  s.stop("Notification settings captured.");

  await saveNotification({
    container,
    input: { configText: result.configText },
  });

  p.log.success(
    `Notification settings saved to: ${pc.cyan(config.notificationFilePath)}`,
  );

  if (result.hasExistingConfig) {
    p.log.warn("Existing notification file was overwritten.");
  }
}

export default define({
  name: "capture",
  description: "Capture current notification settings from kintone app to file",
  args: notificationArgs,
  run: async (ctx) => {
    try {
      const values = ctx.values as NotificationCliValues;

      await routeMultiApp(values, {
        singleLegacy: async () => {
          const config = resolveNotificationContainerConfig(values);
          await runCaptureNotification(config);
        },
        singleApp: async (app, projectConfig) => {
          const config = resolveNotificationAppContainerConfig(
            app,
            projectConfig,
            values,
          );
          await runCaptureNotification(config);
        },
        multiApp: async (plan, projectConfig) => {
          await runMultiAppWithFailCheck(
            plan,
            async (app) => {
              const config = resolveNotificationAppContainerConfig(
                app,
                projectConfig,
                values,
              );
              printAppHeader(app.name, app.appId);
              await runCaptureNotification(config);
            },
            "All notification captures completed successfully.",
          );
        },
      });
    } catch (error) {
      handleCliError(error);
    }
  },
});
