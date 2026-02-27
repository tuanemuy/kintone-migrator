import * as p from "@clack/prompts";
import { define } from "gunshi";
import {
  createGeneralSettingsCliContainer,
  type GeneralSettingsCliContainerConfig,
} from "@/core/application/container/generalSettingsCli";
import { detectGeneralSettingsDiff } from "@/core/application/generalSettings/detectGeneralSettingsDiff";
import { handleCliError } from "../../handleError";
import { printAppHeader, printGeneralSettingsDiffResult } from "../../output";
import { routeMultiApp, runMultiAppWithFailCheck } from "../../projectConfig";
import {
  resolveSettingsAppContainerConfig,
  resolveSettingsContainerConfig,
  type SettingsCliValues,
  settingsArgs,
} from "../../settingsConfig";

async function runDiff(
  config: GeneralSettingsCliContainerConfig,
): Promise<void> {
  const container = createGeneralSettingsCliContainer(config);

  const s = p.spinner();
  s.start("Comparing general settings...");
  const result = await detectGeneralSettingsDiff({ container });
  s.stop("Comparison complete.");

  printGeneralSettingsDiffResult(result);
}

export default define({
  name: "diff",
  description: "Compare local general settings config with remote kintone app",
  args: settingsArgs,
  run: async (ctx) => {
    try {
      const values = ctx.values as SettingsCliValues;

      await routeMultiApp(values, {
        singleLegacy: async () => {
          const config = resolveSettingsContainerConfig(values);
          await runDiff(config);
        },
        singleApp: async (app, projectConfig) => {
          const config = resolveSettingsAppContainerConfig(
            app,
            projectConfig,
            values,
          );
          await runDiff(config);
        },
        multiApp: async (plan, projectConfig) => {
          await runMultiAppWithFailCheck(plan, async (app) => {
            const config = resolveSettingsAppContainerConfig(
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
