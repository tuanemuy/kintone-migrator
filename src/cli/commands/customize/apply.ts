import { dirname, join, resolve } from "node:path";
import * as p from "@clack/prompts";
import { define } from "gunshi";
import {
  type CustomizationCliContainerConfig,
  createCustomizationCliContainer,
} from "@/core/application/container/cli";
import type { CustomizationContainer } from "@/core/application/container/customization";
import { applyCustomization } from "@/core/application/customization/applyCustomization";
import { confirmArgs } from "../../config";
import {
  type CustomizeCliValues,
  customizeArgs,
  resolveCustomizeAppConfig,
  resolveCustomizeConfig,
} from "../../customizeConfig";
import { handleCliError } from "../../handleError";
import { confirmAndDeploy, printAppHeader } from "../../output";
import { routeMultiApp, runMultiAppWithFailCheck } from "../../projectConfig";
import { deriveFilePrefix } from "./capture";

async function applyCustomizationForApp(
  config: CustomizationCliContainerConfig,
): Promise<CustomizationContainer> {
  const container = createCustomizationCliContainer(config);
  const filePrefix = deriveFilePrefix(config.customizeFilePath);
  const basePath = join(dirname(resolve(config.customizeFilePath)), filePrefix);

  const s = p.spinner();
  s.start("Applying customization...");
  await applyCustomization({
    container,
    input: { basePath },
  });
  s.stop("Customization applied.");

  return container;
}

export default define({
  name: "apply",
  description: "Apply JS/CSS customization to kintone app",
  args: { ...customizeArgs, ...confirmArgs },
  run: async (ctx) => {
    try {
      const values = ctx.values as CustomizeCliValues & { yes?: boolean };
      const skipConfirm = values.yes === true;

      await routeMultiApp(values, {
        singleLegacy: async () => {
          const config = resolveCustomizeConfig(values);
          const container = await applyCustomizationForApp(config);
          await confirmAndDeploy(
            [container],
            skipConfirm,
            "Customization applied and deployed successfully.",
          );
        },
        singleApp: async (app, projectConfig) => {
          const config = resolveCustomizeAppConfig(app, projectConfig, values);
          const container = await applyCustomizationForApp(config);
          await confirmAndDeploy(
            [container],
            skipConfirm,
            "Customization applied and deployed successfully.",
          );
        },
        multiApp: async (plan, projectConfig) => {
          const containers: CustomizationContainer[] = [];
          await runMultiAppWithFailCheck(
            plan,
            async (app) => {
              const config = resolveCustomizeAppConfig(
                app,
                projectConfig,
                values,
              );
              printAppHeader(app.name, app.appId);
              const container = await applyCustomizationForApp(config);
              containers.push(container);
            },
            undefined,
          );
          await confirmAndDeploy(
            containers,
            skipConfirm,
            "Customization applied and deployed successfully.",
          );
        },
      });
    } catch (error) {
      handleCliError(error);
    }
  },
});
