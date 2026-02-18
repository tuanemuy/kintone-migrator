import * as p from "@clack/prompts";
import { define } from "gunshi";
import type { NotificationContainer } from "@/core/application/container/notification";
import {
  createNotificationCliContainer,
  type NotificationCliContainerConfig,
} from "@/core/application/container/notificationCli";
import { applyNotification } from "@/core/application/notification/applyNotification";
import { confirmArgs } from "../../config";
import { handleCliError } from "../../handleError";
import {
  type NotificationCliValues,
  notificationArgs,
  resolveNotificationAppContainerConfig,
  resolveNotificationContainerConfig,
} from "../../notificationConfig";
import { confirmAndDeploy, printAppHeader } from "../../output";
import { routeMultiApp, runMultiAppWithFailCheck } from "../../projectConfig";

async function runNotification(
  config: NotificationCliContainerConfig,
): Promise<NotificationContainer> {
  const container = createNotificationCliContainer(config);

  const s = p.spinner();
  s.start("Applying notification settings...");
  await applyNotification({ container });
  s.stop("Notification settings applied.");

  p.log.success("Notification settings applied successfully.");

  return container;
}

export default define({
  name: "apply",
  description: "Apply notification settings from YAML to kintone app",
  args: { ...notificationArgs, ...confirmArgs },
  run: async (ctx) => {
    try {
      const values = ctx.values as NotificationCliValues & { yes?: boolean };
      const skipConfirm = values.yes === true;

      await routeMultiApp(values, {
        singleLegacy: async () => {
          const config = resolveNotificationContainerConfig(values);
          const container = await runNotification(config);
          await confirmAndDeploy([container], skipConfirm);
        },
        singleApp: async (app, projectConfig) => {
          const config = resolveNotificationAppContainerConfig(
            app,
            projectConfig,
            values,
          );
          const container = await runNotification(config);
          await confirmAndDeploy([container], skipConfirm);
        },
        multiApp: async (plan, projectConfig) => {
          const containers: NotificationContainer[] = [];
          await runMultiAppWithFailCheck(
            plan,
            async (app) => {
              const config = resolveNotificationAppContainerConfig(
                app,
                projectConfig,
                values,
              );
              printAppHeader(app.name, app.appId);
              const container = await runNotification(config);
              containers.push(container);
            },
            undefined,
          );
          await confirmAndDeploy(containers, skipConfirm);
        },
      });
    } catch (error) {
      handleCliError(error);
    }
  },
});
