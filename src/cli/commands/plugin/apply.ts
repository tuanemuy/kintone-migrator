import * as p from "@clack/prompts";
import { define } from "gunshi";
import type { PluginContainer } from "@/core/application/container/plugin";
import type { PluginCliContainerConfig } from "@/core/application/container/pluginCli";
import { createPluginCliContainer } from "@/core/application/container/pluginCli";
import { applyPlugin } from "@/core/application/plugin/applyPlugin";
import { confirmArgs, type WithConfirm } from "../../config";
import { handleCliError } from "../../handleError";
import { confirmAndDeploy } from "../../output";
import {
  type PluginCliValues,
  pluginArgs,
  resolvePluginAppContainerConfig,
  resolvePluginContainerConfig,
} from "../../pluginConfig";
import { routeMultiApp, runMultiAppWithHeaders } from "../../projectConfig";

async function runPlugin(
  config: PluginCliContainerConfig,
): Promise<PluginContainer> {
  const container = createPluginCliContainer(config);

  const s = p.spinner();
  s.start("Applying plugins...");
  await applyPlugin({ container });
  s.stop("Plugins applied.");

  p.log.success("Plugins applied successfully.");

  return container;
}

export default define({
  name: "apply",
  description: "Apply plugins from YAML to kintone app",
  args: { ...pluginArgs, ...confirmArgs },
  run: async (ctx) => {
    try {
      const values = ctx.values as WithConfirm<PluginCliValues>;
      const skipConfirm = values.yes === true;

      await routeMultiApp(values, {
        singleLegacy: async () => {
          const config = resolvePluginContainerConfig(values);
          const container = await runPlugin(config);
          await confirmAndDeploy([container], skipConfirm);
        },
        singleApp: async (app, projectConfig) => {
          const config = resolvePluginAppContainerConfig(
            app,
            projectConfig,
            values,
          );
          const container = await runPlugin(config);
          await confirmAndDeploy([container], skipConfirm);
        },
        multiApp: async (plan, projectConfig) => {
          const containers: PluginContainer[] = [];
          await runMultiAppWithHeaders(plan, async (app) => {
            const config = resolvePluginAppContainerConfig(
              app,
              projectConfig,
              values,
            );
            const container = await runPlugin(config);
            containers.push(container);
          });
          await confirmAndDeploy(containers, skipConfirm);
        },
      });
    } catch (error) {
      handleCliError(error);
    }
  },
});
