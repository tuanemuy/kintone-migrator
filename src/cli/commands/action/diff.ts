import * as p from "@clack/prompts";
import { define } from "gunshi";
import { detectActionThreeWayDiff } from "@/core/application/action/detectActionThreeWayDiff";
import {
  type ActionCliContainerConfig,
  createActionCliContainer,
} from "@/core/application/container/actionCli";
import {
  actionArgs,
  resolveActionAppContainerConfig,
  resolveActionContainerConfig,
} from "../../actionConfig";
import { handleCliError } from "../../handleError";
import {
  printActionDiffResult,
  printAppHeader,
  printThreeWayDiffResult,
} from "../../output";
import { routeMultiApp, runMultiAppWithFailCheck } from "../../projectConfig";

async function runDiff(
  containerConfig: ActionCliContainerConfig,
): Promise<void> {
  const container = createActionCliContainer(containerConfig);

  const s = p.spinner();
  s.start("Comparing action settings...");
  let result: Awaited<ReturnType<typeof detectActionThreeWayDiff>>;
  try {
    result = await detectActionThreeWayDiff({ container });
  } catch (error) {
    s.stop("Comparison failed.");
    throw error;
  }
  s.stop("Comparison complete.");

  printThreeWayDiffResult(result, printActionDiffResult);
}

export default define({
  name: "diff",
  description: "Compare local action config with remote kintone app (3-way)",
  args: actionArgs,
  run: async (ctx) => {
    try {
      await routeMultiApp(ctx.values, {
        singleLegacy: async () => {
          await runDiff(resolveActionContainerConfig(ctx.values));
        },
        singleApp: async (app, projectConfig) => {
          await runDiff(
            resolveActionAppContainerConfig(app, projectConfig, ctx.values),
          );
        },
        multiApp: async (plan, projectConfig) => {
          await runMultiAppWithFailCheck(
            plan,
            async (app) => {
              printAppHeader(app.name, app.appId);
              await runDiff(
                resolveActionAppContainerConfig(app, projectConfig, ctx.values),
              );
            },
            "All action diffs completed successfully.",
          );
        },
      });
    } catch (error) {
      handleCliError(error);
    }
  },
});
