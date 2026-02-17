import { basename, dirname, resolve } from "node:path";
import * as p from "@clack/prompts";
import { define } from "gunshi";
import pc from "picocolors";
import {
  type CustomizationCliContainerConfig,
  createCustomizationCliContainer,
} from "@/core/application/container/cli";
import { captureCustomization } from "@/core/application/customization/captureCustomization";
import { saveCustomization } from "@/core/application/customization/saveCustomization";
import {
  type CustomizeCliValues,
  customizeArgs,
  resolveCustomizeAppConfig,
  resolveCustomizeConfig,
} from "../../customizeConfig";
import { handleCliError } from "../../handleError";
import { printAppHeader } from "../../output";
import { routeMultiApp, runMultiAppWithFailCheck } from "../../projectConfig";

export function deriveFilePrefix(customizeFilePath: string): string {
  const resolved = resolve(customizeFilePath);
  const dir = dirname(resolved);
  const parentDir = basename(dir);
  const fileName = basename(resolved, ".yaml");

  if (parentDir === "." || parentDir === "") {
    return fileName === "customize" ? "customize" : fileName;
  }

  if (fileName === "customize") {
    return parentDir;
  }

  return fileName;
}

async function runCaptureCustomization(
  config: CustomizationCliContainerConfig,
): Promise<void> {
  const container = createCustomizationCliContainer(config);
  const basePath = dirname(resolve(config.customizeFilePath));
  const filePrefix = deriveFilePrefix(config.customizeFilePath);

  const s = p.spinner();
  s.start("Capturing customization...");
  const result = await captureCustomization({
    container,
    input: { basePath, filePrefix },
  });
  s.stop("Customization captured.");

  await saveCustomization({
    container,
    input: { configText: result.configText },
  });

  p.log.success(`Customization saved to: ${pc.cyan(config.customizeFilePath)}`);

  if (result.downloadedFileCount > 0) {
    p.log.info(
      `Downloaded ${result.downloadedFileCount} file(s) to: ${pc.cyan(basePath)}`,
    );
  }

  if (result.hasExistingConfig) {
    p.log.warn("Existing customization file was overwritten.");
  }
}

export default define({
  name: "capture",
  description:
    "Capture current JS/CSS customization settings from kintone app to file",
  args: customizeArgs,
  run: async (ctx) => {
    try {
      const values = ctx.values as CustomizeCliValues;

      await routeMultiApp(values, {
        singleLegacy: async () => {
          const config = resolveCustomizeConfig(values);
          await runCaptureCustomization(config);
        },
        singleApp: async (app, projectConfig) => {
          const config = resolveCustomizeAppConfig(app, projectConfig, values);
          await runCaptureCustomization(config);
        },
        multiApp: async (plan, projectConfig) => {
          await runMultiAppWithFailCheck(
            plan,
            async (app) => {
              const config = resolveCustomizeAppConfig(
                app,
                projectConfig,
                values,
              );
              printAppHeader(app.name, app.appId);
              await runCaptureCustomization(config);
            },
            "All customization captures completed successfully.",
          );
        },
      });
    } catch (error) {
      handleCliError(error);
    }
  },
});
