import * as p from "@clack/prompts";
import { define } from "gunshi";
import type { GeneralSettingsContainer } from "@/core/application/container/generalSettings";
import {
  createGeneralSettingsCliContainer,
  type GeneralSettingsCliContainerConfig,
} from "@/core/application/container/generalSettingsCli";
import { applyGeneralSettings } from "@/core/application/generalSettings/applyGeneralSettings";
import { confirmArgs } from "../../config";
import { handleCliError } from "../../handleError";
import { printAppHeader } from "../../output";
import { routeMultiApp, runMultiAppWithFailCheck } from "../../projectConfig";
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

async function confirmAndDeploy(
  containers: readonly GeneralSettingsContainer[],
  skipConfirm: boolean,
): Promise<void> {
  if (!skipConfirm) {
    const shouldDeploy = await p.confirm({
      message: "Deploy to production?",
    });

    if (p.isCancel(shouldDeploy) || !shouldDeploy) {
      p.log.warn("Applied to preview, but not deployed to production.");
      return;
    }
  }

  const ds = p.spinner();
  ds.start("Deploying to production...");
  for (const container of containers) {
    await container.appDeployer.deploy();
  }
  ds.stop("Deployed to production.");

  p.log.success("Deployed to production.");
}

export default define({
  name: "apply",
  description: "Apply general settings from YAML to kintone app",
  args: { ...settingsArgs, ...confirmArgs },
  run: async (ctx) => {
    try {
      const values = ctx.values as SettingsCliValues & { yes?: boolean };
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
          const containers: GeneralSettingsContainer[] = [];
          await runMultiAppWithFailCheck(
            plan,
            async (app) => {
              const config = resolveSettingsAppContainerConfig(
                app,
                projectConfig,
                values,
              );
              printAppHeader(app.name, app.appId);
              const container = await runSettings(config);
              containers.push(container);
            },
            "All general settings applied successfully.",
          );
          await confirmAndDeploy(containers, skipConfirm);
        },
      });
    } catch (error) {
      handleCliError(error);
    }
  },
});
