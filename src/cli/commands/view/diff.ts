import * as p from "@clack/prompts";
import { define } from "gunshi";
import {
  createViewCliContainer,
  type ViewCliContainerConfig,
} from "@/core/application/container/viewCli";
import { detectViewThreeWayDiff } from "@/core/application/view/detectViewThreeWayDiff";
import { handleCliError } from "../../handleError";
import {
  printAppHeader,
  printThreeWayDiffResult,
  printViewDiffResult,
} from "../../output";
import { routeMultiApp, runMultiAppWithFailCheck } from "../../projectConfig";
import {
  resolveViewAppContainerConfig,
  resolveViewContainerConfig,
  viewArgs,
} from "../../viewConfig";

async function runDiff(containerConfig: ViewCliContainerConfig): Promise<void> {
  const container = createViewCliContainer(containerConfig);

  const s = p.spinner();
  s.start("Comparing view settings...");
  let result: Awaited<ReturnType<typeof detectViewThreeWayDiff>>;
  try {
    result = await detectViewThreeWayDiff({ container });
  } catch (error) {
    s.stop("Comparison failed.");
    throw error;
  }
  s.stop("Comparison complete.");

  printThreeWayDiffResult(result, printViewDiffResult);
}

export default define({
  name: "diff",
  description: "Compare local view config with remote kintone app (3-way)",
  args: viewArgs,
  run: async (ctx) => {
    try {
      await routeMultiApp(ctx.values, {
        singleLegacy: async () => {
          await runDiff(resolveViewContainerConfig(ctx.values));
        },
        singleApp: async (app, projectConfig) => {
          await runDiff(
            resolveViewAppContainerConfig(app, projectConfig, ctx.values),
          );
        },
        multiApp: async (plan, projectConfig) => {
          await runMultiAppWithFailCheck(
            plan,
            async (app) => {
              printAppHeader(app.name, app.appId);
              await runDiff(
                resolveViewAppContainerConfig(app, projectConfig, ctx.values),
              );
            },
            "All view diffs completed successfully.",
          );
        },
      });
    } catch (error) {
      handleCliError(error);
    }
  },
});
