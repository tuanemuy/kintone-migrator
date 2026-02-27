import * as p from "@clack/prompts";
import { define } from "gunshi";
import {
  createPluginCliContainer,
  type PluginCliContainerConfig,
} from "@/core/application/container/pluginCli";
import { detectPluginDiff } from "@/core/application/plugin/detectPluginDiff";
import { handleCliError } from "../../handleError";
import { printAppHeader, printPluginDiffResult } from "../../output";
import {
  type PluginCliValues,
  pluginArgs,
  resolvePluginAppContainerConfig,
  resolvePluginContainerConfig,
} from "../../pluginConfig";
import { routeMultiApp, runMultiAppWithFailCheck } from "../../projectConfig";

async function runDiff(config: PluginCliContainerConfig): Promise<void> {
  const container = createPluginCliContainer(config);

  const s = p.spinner();
  s.start("Comparing plugin settings...");
  const result = await detectPluginDiff({ container });
  s.stop("Comparison complete.");

  printPluginDiffResult(result);
}

export default define({
  name: "diff",
  description: "Compare local plugin config with remote kintone app",
  args: pluginArgs,
  run: async (ctx) => {
    try {
      const values = ctx.values as PluginCliValues;

      await routeMultiApp(values, {
        singleLegacy: async () => {
          const config = resolvePluginContainerConfig(values);
          await runDiff(config);
        },
        singleApp: async (app, projectConfig) => {
          const config = resolvePluginAppContainerConfig(
            app,
            projectConfig,
            values,
          );
          await runDiff(config);
        },
        multiApp: async (plan, projectConfig) => {
          await runMultiAppWithFailCheck(plan, async (app) => {
            const config = resolvePluginAppContainerConfig(
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
