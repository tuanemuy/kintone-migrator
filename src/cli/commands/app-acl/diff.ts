import * as p from "@clack/prompts";
import { define } from "gunshi";
import { detectAppPermissionThreeWayDiff } from "@/core/application/appPermission/detectAppPermissionThreeWayDiff";
import {
  type AppPermissionCliContainerConfig,
  createAppPermissionCliContainer,
} from "@/core/application/container/appPermissionCli";
import {
  appAclArgs,
  resolveAppAclAppContainerConfig,
  resolveAppAclContainerConfig,
} from "../../appAclConfig";
import { handleCliError } from "../../handleError";
import {
  printAppHeader,
  printAppPermissionDiffResult,
  printThreeWayDiffResult,
} from "../../output";
import { routeMultiApp, runMultiAppWithFailCheck } from "../../projectConfig";

async function runDiff(
  containerConfig: AppPermissionCliContainerConfig,
): Promise<void> {
  const container = createAppPermissionCliContainer(containerConfig);

  const s = p.spinner();
  s.start("Comparing app permissions...");
  let result: Awaited<ReturnType<typeof detectAppPermissionThreeWayDiff>>;
  try {
    result = await detectAppPermissionThreeWayDiff({ container });
  } catch (error) {
    s.stop("Comparison failed.");
    throw error;
  }
  s.stop("Comparison complete.");

  printThreeWayDiffResult(result, printAppPermissionDiffResult);
}

export default define({
  name: "diff",
  description:
    "Compare local app permission config with remote kintone app (3-way)",
  args: appAclArgs,
  run: async (ctx) => {
    try {
      await routeMultiApp(ctx.values, {
        singleLegacy: async () => {
          await runDiff(resolveAppAclContainerConfig(ctx.values));
        },
        singleApp: async (app, projectConfig) => {
          await runDiff(
            resolveAppAclAppContainerConfig(app, projectConfig, ctx.values),
          );
        },
        multiApp: async (plan, projectConfig) => {
          await runMultiAppWithFailCheck(
            plan,
            async (app) => {
              printAppHeader(app.name, app.appId);
              await runDiff(
                resolveAppAclAppContainerConfig(app, projectConfig, ctx.values),
              );
            },
            "All app permission diffs completed successfully.",
          );
        },
      });
    } catch (error) {
      handleCliError(error);
    }
  },
});
