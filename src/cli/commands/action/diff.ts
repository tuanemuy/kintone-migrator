import * as p from "@clack/prompts";
import { define } from "gunshi";
import { detectActionDiff } from "@/core/application/action/detectActionDiff";
import {
  type ActionCliContainerConfig,
  createActionCliContainer,
} from "@/core/application/container/actionCli";
import {
  type ActionCliValues,
  actionArgs,
  resolveActionAppContainerConfig,
  resolveActionContainerConfig,
} from "../../actionConfig";
import { handleCliError } from "../../handleError";
import { printActionDiffResult, printAppHeader } from "../../output";
import { routeMultiApp, runMultiAppWithFailCheck } from "../../projectConfig";

async function runDiff(config: ActionCliContainerConfig): Promise<void> {
  const container = createActionCliContainer(config);

  const s = p.spinner();
  s.start("Comparing action settings...");
  const result = await detectActionDiff({ container });
  s.stop("Comparison complete.");

  printActionDiffResult(result);
}

export default define({
  name: "diff",
  description: "Compare local action config with remote kintone app",
  args: actionArgs,
  run: async (ctx) => {
    try {
      const values = ctx.values as ActionCliValues;

      await routeMultiApp(values, {
        singleLegacy: async () => {
          const config = resolveActionContainerConfig(values);
          await runDiff(config);
        },
        singleApp: async (app, projectConfig) => {
          const config = resolveActionAppContainerConfig(
            app,
            projectConfig,
            values,
          );
          await runDiff(config);
        },
        multiApp: async (plan, projectConfig) => {
          await runMultiAppWithFailCheck(plan, async (app) => {
            const config = resolveActionAppContainerConfig(
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
