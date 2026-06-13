import * as p from "@clack/prompts";
import { define } from "gunshi";
import {
  createProcessManagementCliContainer,
  type ProcessManagementCliContainerConfig,
} from "@/core/application/container/processManagementCli";
import { detectProcessManagementThreeWayDiff } from "@/core/application/processManagement/detectProcessManagementThreeWayDiff";
import { handleCliError } from "../../handleError";
import {
  printAppHeader,
  printProcessDiffResult,
  printThreeWayDiffResult,
} from "../../output";
import {
  processArgs,
  resolveProcessAppContainerConfig,
  resolveProcessContainerConfig,
} from "../../processConfig";
import { routeMultiApp, runMultiAppWithFailCheck } from "../../projectConfig";

async function runDiff(
  containerConfig: ProcessManagementCliContainerConfig,
): Promise<void> {
  const container = createProcessManagementCliContainer(containerConfig);

  const s = p.spinner();
  s.start("Comparing process management settings...");
  let result: Awaited<ReturnType<typeof detectProcessManagementThreeWayDiff>>;
  try {
    result = await detectProcessManagementThreeWayDiff({ container });
  } catch (error) {
    s.stop("Comparison failed.");
    throw error;
  }
  s.stop("Comparison complete.");

  printThreeWayDiffResult(result, printProcessDiffResult);
}

export default define({
  name: "diff",
  description:
    "Compare local process management config with remote kintone app (3-way)",
  args: processArgs,
  run: async (ctx) => {
    try {
      await routeMultiApp(ctx.values, {
        singleLegacy: async () => {
          await runDiff(resolveProcessContainerConfig(ctx.values));
        },
        singleApp: async (app, projectConfig) => {
          await runDiff(
            resolveProcessAppContainerConfig(app, projectConfig, ctx.values),
          );
        },
        multiApp: async (plan, projectConfig) => {
          await runMultiAppWithFailCheck(
            plan,
            async (app) => {
              printAppHeader(app.name, app.appId);
              await runDiff(
                resolveProcessAppContainerConfig(
                  app,
                  projectConfig,
                  ctx.values,
                ),
              );
            },
            "All process management diffs completed successfully.",
          );
        },
      });
    } catch (error) {
      handleCliError(error);
    }
  },
});
