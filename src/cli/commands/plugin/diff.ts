import * as p from "@clack/prompts";
import { define } from "gunshi";
import {
  createPluginCliContainer,
  type PluginCliContainerConfig,
} from "@/core/application/container/pluginCli";
import { detectPluginThreeWayDiff } from "@/core/application/plugin/detectPluginThreeWayDiff";
import { handleCliError } from "../../handleError";
import {
  printAppHeader,
  printPluginDiffResult,
  printThreeWayDiffResult,
} from "../../output";
import {
  pluginArgs,
  resolvePluginAppContainerConfig,
  resolvePluginContainerConfig,
} from "../../pluginConfig";
import { routeMultiApp, runMultiAppWithFailCheck } from "../../projectConfig";

async function runDiff(
  containerConfig: PluginCliContainerConfig,
): Promise<void> {
  const container = createPluginCliContainer(containerConfig);

  const s = p.spinner();
  s.start("Comparing plugin settings...");
  let result: Awaited<ReturnType<typeof detectPluginThreeWayDiff>>;
  try {
    result = await detectPluginThreeWayDiff({ container });
  } catch (error) {
    s.stop("Comparison failed.");
    throw error;
  }
  s.stop("Comparison complete.");

  printThreeWayDiffResult(result, printPluginDiffResult);
}

export default define({
  name: "diff",
  description: "Compare local plugin config with remote kintone app (3-way)",
  args: pluginArgs,
  run: async (ctx) => {
    try {
      await routeMultiApp(ctx.values, {
        singleLegacy: async () => {
          await runDiff(resolvePluginContainerConfig(ctx.values));
        },
        singleApp: async (app, projectConfig) => {
          await runDiff(
            resolvePluginAppContainerConfig(app, projectConfig, ctx.values),
          );
        },
        multiApp: async (plan, projectConfig) => {
          await runMultiAppWithFailCheck(
            plan,
            async (app) => {
              printAppHeader(app.name, app.appId);
              await runDiff(
                resolvePluginAppContainerConfig(app, projectConfig, ctx.values),
              );
            },
            "All plugin diffs completed successfully.",
          );
        },
      });
    } catch (error) {
      handleCliError(error);
    }
  },
});
