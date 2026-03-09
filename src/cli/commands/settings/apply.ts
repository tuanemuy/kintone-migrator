import * as p from "@clack/prompts";
import { define } from "gunshi";
import type { GeneralSettingsContainer } from "@/core/application/container/generalSettings";
import {
  createGeneralSettingsCliContainer,
  type GeneralSettingsCliContainerConfig,
} from "@/core/application/container/generalSettingsCli";
import { applyGeneralSettings } from "@/core/application/generalSettings/applyGeneralSettings";
import { confirmArgs, type WithConfirm } from "../../config";
import { handleCliError } from "../../handleError";
import { confirmAndDeploy, type Deployable } from "../../output";
import { routeMultiApp, runMultiAppWithHeaders } from "../../projectConfig";
import {
  resolveSettingsAppContainerConfig,
  resolveSettingsContainerConfig,
  type SettingsCliValues,
  settingsArgs,
} from "../../settingsConfig";

async function runSettings(
  config: GeneralSettingsCliContainerConfig,
): Promise<GeneralSettingsContainer> {
  const container = createGeneralSettingsCliContainer(config);

  const s = p.spinner();
  s.start("Applying general settings...");
  await applyGeneralSettings({ container });
  s.stop("General settings applied.");

  p.log.success("General settings applied successfully.");

  return container;
}

export default define({
  name: "apply",
  description: "Apply general settings from YAML to kintone app",
  args: { ...settingsArgs, ...confirmArgs },
  run: async (ctx) => {
    try {
      const values = ctx.values as WithConfirm<SettingsCliValues>;
      const skipConfirm = values.yes === true;

      await routeMultiApp(values, {
        singleLegacy: async () => {
          const config = resolveSettingsContainerConfig(values);
          const container = await runSettings(config);
          await confirmAndDeploy([container], skipConfirm);
        },
        singleApp: async (app, projectConfig) => {
          const config = resolveSettingsAppContainerConfig(
            app,
            projectConfig,
            values,
          );
          const container = await runSettings(config);
          await confirmAndDeploy([container], skipConfirm);
        },
        multiApp: async (plan, projectConfig) => {
          const containers: Deployable[] = [];
          await runMultiAppWithHeaders(plan, async (app) => {
            const config = resolveSettingsAppContainerConfig(
              app,
              projectConfig,
              values,
            );
            const container = await runSettings(config);
            containers.push({
              appDeployer: container.appDeployer,
              appName: app.name,
            });
          });
          await confirmAndDeploy(containers, skipConfirm);
        },
      });
    } catch (error) {
      handleCliError(error);
    }
  },
});
