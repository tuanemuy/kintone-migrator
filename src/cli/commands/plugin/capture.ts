import * as p from "@clack/prompts";
import { define } from "gunshi";
import pc from "picocolors";
import type { PluginCliContainerConfig } from "@/core/application/container/pluginCli";
import { createPluginCliContainer } from "@/core/application/container/pluginCli";
import { capturePlugin } from "@/core/application/plugin/capturePlugin";
import { savePlugin } from "@/core/application/plugin/savePlugin";
import { handleCliError } from "../../handleError";
import { printAppHeader } from "../../output";
import {
  type PluginCliValues,
  pluginArgs,
  resolvePluginAppContainerConfig,
  resolvePluginContainerConfig,
} from "../../pluginConfig";
import { routeMultiApp, runMultiAppWithFailCheck } from "../../projectConfig";

async function runCapturePlugin(
  config: PluginCliContainerConfig,
): Promise<void> {
  const container = createPluginCliContainer(config);

  const s = p.spinner();
  s.start("Capturing plugins...");
  const result = await capturePlugin({ container });
  s.stop("Plugins captured.");

  await savePlugin({
    container,
    input: { configText: result.configText },
  });

  p.log.success(`Plugins saved to: ${pc.cyan(config.pluginFilePath)}`);

  if (result.hasExistingConfig) {
    p.log.warn("Existing plugin file was overwritten.");
  }
}

export default define({
  name: "capture",
  description: "Capture current plugins from kintone app to file",
  args: pluginArgs,
  run: async (ctx) => {
    try {
      const values = ctx.values as PluginCliValues;

      await routeMultiApp(values, {
        singleLegacy: async () => {
          const config = resolvePluginContainerConfig(values);
          await runCapturePlugin(config);
        },
        singleApp: async (app, projectConfig) => {
          const config = resolvePluginAppContainerConfig(
            app,
            projectConfig,
            values,
          );
          await runCapturePlugin(config);
        },
        multiApp: async (plan, projectConfig) => {
          await runMultiAppWithFailCheck(
            plan,
            async (app) => {
              const config = resolvePluginAppContainerConfig(
                app,
                projectConfig,
                values,
              );
              printAppHeader(app.name, app.appId);
              await runCapturePlugin(config);
            },
            "All plugin captures completed successfully.",
          );
        },
      });
    } catch (error) {
      handleCliError(error);
    }
  },
});
