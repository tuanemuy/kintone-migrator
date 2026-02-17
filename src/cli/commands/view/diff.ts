import * as p from "@clack/prompts";
import { define } from "gunshi";
import {
  createViewCliContainer,
  type ViewCliContainerConfig,
} from "@/core/application/container/viewCli";
import { detectViewDiff } from "@/core/application/view/detectViewDiff";
import { handleCliError } from "../../handleError";
import { printAppHeader, printViewDiffResult } from "../../output";
import { routeMultiApp, runMultiAppWithFailCheck } from "../../projectConfig";
import {
  resolveViewAppContainerConfig,
  resolveViewContainerConfig,
  type ViewCliValues,
  viewArgs,
} from "../../viewConfig";

async function runDiff(config: ViewCliContainerConfig): Promise<void> {
  const container = createViewCliContainer(config);

  const s = p.spinner();
  s.start("Fetching views...");
  const result = await detectViewDiff({ container });
  s.stop("Views fetched.");

  printViewDiffResult(result);
}

export default define({
  name: "diff",
  description:
    "Detect differences between view config file and current kintone views",
  args: viewArgs,
  run: async (ctx) => {
    try {
      const values = ctx.values as ViewCliValues;

      await routeMultiApp(values, {
        singleLegacy: async () => {
          const config = resolveViewContainerConfig(values);
          await runDiff(config);
        },
        singleApp: async (app, projectConfig) => {
          const config = resolveViewAppContainerConfig(
            app,
            projectConfig,
            values,
          );
          await runDiff(config);
        },
        multiApp: async (plan, projectConfig) => {
          await runMultiAppWithFailCheck(plan, async (app) => {
            const config = resolveViewAppContainerConfig(
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
