import * as p from "@clack/prompts";
import { define } from "gunshi";
import {
  createNotificationCliContainer,
  type NotificationCliContainerConfig,
} from "@/core/application/container/notificationCli";
import { detectNotificationDiff } from "@/core/application/notification/detectNotificationDiff";
import { handleCliError } from "../../handleError";
import {
  type NotificationCliValues,
  notificationArgs,
  resolveNotificationAppContainerConfig,
  resolveNotificationContainerConfig,
} from "../../notificationConfig";
import { printAppHeader, printNotificationDiffResult } from "../../output";
import { routeMultiApp, runMultiAppWithFailCheck } from "../../projectConfig";

async function runDiff(config: NotificationCliContainerConfig): Promise<void> {
  const container = createNotificationCliContainer(config);

  const s = p.spinner();
  s.start("Comparing notification settings...");
  const result = await detectNotificationDiff({ container });
  s.stop("Comparison complete.");

  printNotificationDiffResult(result);
}

export default define({
  name: "diff",
  description: "Compare local notification config with remote kintone app",
  args: notificationArgs,
  run: async (ctx) => {
    try {
      const values = ctx.values as NotificationCliValues;

      await routeMultiApp(values, {
        singleLegacy: async () => {
          const config = resolveNotificationContainerConfig(values);
          await runDiff(config);
        },
        singleApp: async (app, projectConfig) => {
          const config = resolveNotificationAppContainerConfig(
            app,
            projectConfig,
            values,
          );
          await runDiff(config);
        },
        multiApp: async (plan, projectConfig) => {
          await runMultiAppWithFailCheck(plan, async (app) => {
            const config = resolveNotificationAppContainerConfig(
              app,
              projectConfig,
              values,
            );
            printAppHeader(app.name, app.appId);
            await runDiff(config);
          });
        },
      });
    } catch (error) {
      handleCliError(error);
    }
  },
});
