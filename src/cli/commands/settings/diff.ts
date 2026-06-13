import * as p from "@clack/prompts";
import { define } from "gunshi";
import {
  createGeneralSettingsCliContainer,
  type GeneralSettingsCliContainerConfig,
} from "@/core/application/container/generalSettingsCli";
import { detectGeneralSettingsThreeWayDiff } from "@/core/application/generalSettings/detectGeneralSettingsThreeWayDiff";
import { handleCliError } from "../../handleError";
import {
  printAppHeader,
  printGeneralSettingsDiffResult,
  printThreeWayDiffResult,
} from "../../output";
import { routeMultiApp, runMultiAppWithFailCheck } from "../../projectConfig";
import {
  resolveSettingsAppContainerConfig,
  resolveSettingsContainerConfig,
  settingsArgs,
} from "../../settingsConfig";

async function runDiff(
  containerConfig: GeneralSettingsCliContainerConfig,
): Promise<void> {
  const container = createGeneralSettingsCliContainer(containerConfig);

  const s = p.spinner();
  s.start("Comparing general settings...");
  let result: Awaited<ReturnType<typeof detectGeneralSettingsThreeWayDiff>>;
  try {
    result = await detectGeneralSettingsThreeWayDiff({ container });
  } catch (error) {
    s.stop("Comparison failed.");
    throw error;
  }
  s.stop("Comparison complete.");

  printThreeWayDiffResult(result, printGeneralSettingsDiffResult);
}

export default define({
  name: "diff",
  description:
    "Compare local general settings config with remote kintone app (3-way)",
  args: settingsArgs,
  run: async (ctx) => {
    try {
      await routeMultiApp(ctx.values, {
        singleLegacy: async () => {
          await runDiff(resolveSettingsContainerConfig(ctx.values));
        },
        singleApp: async (app, projectConfig) => {
          await runDiff(
            resolveSettingsAppContainerConfig(app, projectConfig, ctx.values),
          );
        },
        multiApp: async (plan, projectConfig) => {
          await runMultiAppWithFailCheck(
            plan,
            async (app) => {
              printAppHeader(app.name, app.appId);
              await runDiff(
                resolveSettingsAppContainerConfig(
                  app,
                  projectConfig,
                  ctx.values,
                ),
              );
            },
            "All general settings diffs completed successfully.",
          );
        },
      });
    } catch (error) {
      handleCliError(error);
    }
  },
});
