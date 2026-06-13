import * as p from "@clack/prompts";
import { define } from "gunshi";
import {
  createNotificationCliContainer,
  type NotificationCliContainerConfig,
} from "@/core/application/container/notificationCli";
import { detectNotificationThreeWayDiff } from "@/core/application/notification/detectNotificationThreeWayDiff";
import { handleCliError } from "../../handleError";
import {
  notificationArgs,
  resolveNotificationAppContainerConfig,
  resolveNotificationContainerConfig,
} from "../../notificationConfig";
import {
  printAppHeader,
  printNotificationDiffResult,
  printThreeWayDiffResult,
} from "../../output";
import { routeMultiApp, runMultiAppWithFailCheck } from "../../projectConfig";

async function runDiff(
  containerConfig: NotificationCliContainerConfig,
): Promise<void> {
  const container = createNotificationCliContainer(containerConfig);

  const s = p.spinner();
  s.start("Comparing notification settings...");
  let result: Awaited<ReturnType<typeof detectNotificationThreeWayDiff>>;
  try {
    result = await detectNotificationThreeWayDiff({ container });
  } catch (error) {
    s.stop("Comparison failed.");
    throw error;
  }
  s.stop("Comparison complete.");

  printThreeWayDiffResult(result, printNotificationDiffResult);
}

export default define({
  name: "diff",
  description:
    "Compare local notification config with remote kintone app (3-way)",
  args: notificationArgs,
  run: async (ctx) => {
    try {
      await routeMultiApp(ctx.values, {
        singleLegacy: async () => {
          await runDiff(resolveNotificationContainerConfig(ctx.values));
        },
        singleApp: async (app, projectConfig) => {
          await runDiff(
            resolveNotificationAppContainerConfig(
              app,
              projectConfig,
              ctx.values,
            ),
          );
        },
        multiApp: async (plan, projectConfig) => {
          await runMultiAppWithFailCheck(
            plan,
            async (app) => {
              printAppHeader(app.name, app.appId);
              await runDiff(
                resolveNotificationAppContainerConfig(
                  app,
                  projectConfig,
                  ctx.values,
                ),
              );
            },
            "All notification diffs completed successfully.",
          );
        },
      });
    } catch (error) {
      handleCliError(error);
    }
  },
});
