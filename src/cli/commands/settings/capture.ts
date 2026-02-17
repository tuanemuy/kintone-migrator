import * as p from "@clack/prompts";
import { define } from "gunshi";
import pc from "picocolors";
import {
  createGeneralSettingsCliContainer,
  type GeneralSettingsCliContainerConfig,
} from "@/core/application/container/generalSettingsCli";
import { captureGeneralSettings } from "@/core/application/generalSettings/captureGeneralSettings";
import { saveGeneralSettings } from "@/core/application/generalSettings/saveGeneralSettings";
import { handleCliError } from "../../handleError";
import { printAppHeader } from "../../output";
import { routeMultiApp, runMultiAppWithFailCheck } from "../../projectConfig";
import {
  resolveSettingsAppContainerConfig,
  resolveSettingsContainerConfig,
  type SettingsCliValues,
  settingsArgs,
} from "../../settingsConfig";

async function runCaptureSettings(
  config: GeneralSettingsCliContainerConfig,
): Promise<void> {
  const container = createGeneralSettingsCliContainer(config);

  const s = p.spinner();
  s.start("Capturing general settings...");
  const result = await captureGeneralSettings({ container });
  s.stop("General settings captured.");

  await saveGeneralSettings({
    container,
    input: { configText: result.configText },
  });

  p.log.success(
    `General settings saved to: ${pc.cyan(config.settingsFilePath)}`,
  );

  if (result.hasExistingConfig) {
    p.log.warn("Existing general settings file was overwritten.");
  }
}

export default define({
  name: "capture",
  description: "Capture current general settings from kintone app to file",
  args: settingsArgs,
  run: async (ctx) => {
    try {
      const values = ctx.values as SettingsCliValues;

      await routeMultiApp(values, {
        singleLegacy: async () => {
          const config = resolveSettingsContainerConfig(values);
          await runCaptureSettings(config);
        },
        singleApp: async (app, projectConfig) => {
          const config = resolveSettingsAppContainerConfig(
            app,
            projectConfig,
            values,
          );
          await runCaptureSettings(config);
        },
        multiApp: async (plan, projectConfig) => {
          await runMultiAppWithFailCheck(
            plan,
            async (app) => {
              const config = resolveSettingsAppContainerConfig(
                app,
                projectConfig,
                values,
              );
              printAppHeader(app.name, app.appId);
              await runCaptureSettings(config);
            },
            "All general settings captures completed successfully.",
          );
        },
      });
    } catch (error) {
      handleCliError(error);
    }
  },
});
