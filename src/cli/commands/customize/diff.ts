import * as p from "@clack/prompts";
import { define } from "gunshi";
import {
  type CustomizationCliContainerConfig,
  createCustomizationCliContainer,
} from "@/core/application/container/cli";
import { detectCustomizationThreeWayDiff } from "@/core/application/customization/detectCustomizationThreeWayDiff";
import {
  type CustomizeCliValues,
  customizeArgs,
  resolveCustomizeAppConfig,
  resolveCustomizeConfig,
} from "../../customizeConfig";
import { handleCliError } from "../../handleError";
import {
  printAppHeader,
  printCustomizationDiffResult,
  printThreeWayDiffResult,
} from "../../output";
import { routeMultiApp, runMultiAppWithFailCheck } from "../../projectConfig";
import { computeBasePath } from "./capture";

async function runDiff(
  containerConfig: CustomizationCliContainerConfig,
): Promise<void> {
  const container = createCustomizationCliContainer(containerConfig);
  const basePath = computeBasePath(containerConfig.customizeFilePath);

  const s = p.spinner();
  s.start("Comparing customization settings...");
  let result: Awaited<ReturnType<typeof detectCustomizationThreeWayDiff>>;
  try {
    result = await detectCustomizationThreeWayDiff({
      container,
      input: { basePath },
    });
  } catch (error) {
    s.stop("Comparison failed.");
    throw error;
  }
  s.stop("Comparison complete.");

  printThreeWayDiffResult(result, printCustomizationDiffResult);
}

export default define({
  name: "diff",
  description:
    "Compare local customization config with remote kintone app (3-way)",
  args: customizeArgs,
  run: async (ctx) => {
    try {
      const values = ctx.values as CustomizeCliValues;

      await routeMultiApp(values, {
        singleLegacy: async () => {
          await runDiff(resolveCustomizeConfig(values));
        },
        singleApp: async (app, projectConfig) => {
          await runDiff(resolveCustomizeAppConfig(app, projectConfig, values));
        },
        multiApp: async (plan, projectConfig) => {
          await runMultiAppWithFailCheck(
            plan,
            async (app) => {
              printAppHeader(app.name, app.appId);
              await runDiff(
                resolveCustomizeAppConfig(app, projectConfig, values),
              );
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
