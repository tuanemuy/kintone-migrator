import * as p from "@clack/prompts";
import { define } from "gunshi";
import { detectAppPermissionDiff } from "@/core/application/appPermission/detectAppPermissionDiff";
import {
  type AppPermissionCliContainerConfig,
  createAppPermissionCliContainer,
} from "@/core/application/container/appPermissionCli";
import {
  type AppAclCliValues,
  appAclArgs,
  resolveAppAclAppContainerConfig,
  resolveAppAclContainerConfig,
} from "../../appAclConfig";
import { handleCliError } from "../../handleError";
import { printAppHeader, printAppPermissionDiffResult } from "../../output";
import { routeMultiApp, runMultiAppWithFailCheck } from "../../projectConfig";

async function runDiff(config: AppPermissionCliContainerConfig): Promise<void> {
  const container = createAppPermissionCliContainer(config);

  const s = p.spinner();
  s.start("Comparing app permissions...");
  const result = await detectAppPermissionDiff({ container });
  s.stop("Comparison complete.");

  printAppPermissionDiffResult(result);
}

export default define({
  name: "diff",
  description: "Compare local app permission config with remote kintone app",
  args: appAclArgs,
  run: async (ctx) => {
    try {
      const values = ctx.values as AppAclCliValues;

      await routeMultiApp(values, {
        singleLegacy: async () => {
          const config = resolveAppAclContainerConfig(values);
          await runDiff(config);
        },
        singleApp: async (app, projectConfig) => {
          const config = resolveAppAclAppContainerConfig(
            app,
            projectConfig,
            values,
          );
          await runDiff(config);
        },
        multiApp: async (plan, projectConfig) => {
          await runMultiAppWithFailCheck(plan, async (app) => {
            const config = resolveAppAclAppContainerConfig(
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
