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
import { computeBasePath } from "./capture";

async function runDiff(
  containerConfig: CustomizationCliContainerConfig,
): Promise<void> {
  const container = createCustomizationCliContainer(containerConfig);
  const basePath = computeBasePath(containerConfig.customizeFilePath);

  const s = p.spinner();
  s.start("Comparing customization settings...");
  let result: Awaited<ReturnType<typeof detectCustomizationDiff>>;
  try {
    result = await detectCustomizationDiff({
      container,
      input: { basePath },
    });
  } catch (error) {
    s.stop("Comparison failed.");
    throw error;
  }
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
          const containerConfig = resolveCustomizeConfig(values);
          await runDiff(containerConfig);
        },
        singleApp: async (app, projectConfig) => {
          const containerConfig = resolveCustomizeAppConfig(
            app,
            projectConfig,
            values,
          );
          await runDiff(containerConfig);
        },
        multiApp: async (plan, projectConfig) => {
          await runMultiAppWithFailCheck(
            plan,
            async (app) => {
              const containerConfig = resolveCustomizeAppConfig(
                app,
                projectConfig,
                values,
              );
              printAppHeader(app.name, app.appId);
              await runDiff(containerConfig);
            },
            "All customization diffs completed successfully.",
          );
        },
      });
    } catch (error) {
      handleCliError(error);
    }
  },
});
