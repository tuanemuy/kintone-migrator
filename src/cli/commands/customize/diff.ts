import * as p from "@clack/prompts";
import { define } from "gunshi";
import {
  type CustomizationCliContainerConfig,
  createCustomizationCliContainer,
} from "@/core/application/container/cli";
import { detectCustomizationDiff } from "@/core/application/customization/detectCustomizationDiff";
import {
  type CustomizeCliValues,
  customizeArgs,
  resolveCustomizeAppConfig,
  resolveCustomizeConfig,
} from "../../customizeConfig";
import { handleCliError } from "../../handleError";
import { printAppHeader, printCustomizationDiffResult } from "../../output";
import { routeMultiApp, runMultiAppWithFailCheck } from "../../projectConfig";

async function runDiff(config: CustomizationCliContainerConfig): Promise<void> {
  const container = createCustomizationCliContainer(config);

  const s = p.spinner();
  s.start("Comparing customization settings...");
  const result = await detectCustomizationDiff({ container });
  s.stop("Comparison complete.");

  printCustomizationDiffResult(result);
}

export default define({
  name: "diff",
  description: "Compare local customization config with remote kintone app",
  args: customizeArgs,
  run: async (ctx) => {
    try {
      const values = ctx.values as CustomizeCliValues;

      await routeMultiApp(values, {
        singleLegacy: async () => {
          const config = resolveCustomizeConfig(values);
          await runDiff(config);
        },
        singleApp: async (app, projectConfig) => {
          const config = resolveCustomizeAppConfig(app, projectConfig, values);
          await runDiff(config);
        },
        multiApp: async (plan, projectConfig) => {
          await runMultiAppWithFailCheck(plan, async (app) => {
            const config = resolveCustomizeAppConfig(
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
