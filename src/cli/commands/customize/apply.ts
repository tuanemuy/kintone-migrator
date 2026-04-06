import * as p from "@clack/prompts";
import { define } from "gunshi";
import {
  type CustomizationCliContainerConfig,
  createCustomizationCliContainer,
} from "@/core/application/container/cli";
import type { CustomizationContainer } from "@/core/application/container/customization";
import { applyCustomization } from "@/core/application/customization/applyCustomization";
import { detectCustomizationDiff } from "@/core/application/customization/detectCustomizationDiff";
import { SystemError, SystemErrorCode } from "@/core/application/error";
import type { AppEntry } from "@/core/domain/projectConfig/entity";
import { confirmArgs, type WithConfirm } from "../../config";
import {
  type CustomizeCliValues,
  customizeArgs,
  resolveCustomizeAppConfig,
  resolveCustomizeConfig,
} from "../../customizeConfig";
import { handleCliError } from "../../handleError";
import {
  confirmAndDeploy,
  type Deployable,
  printAppHeader,
  printCustomizationDiffResult,
} from "../../output";
import { routeMultiApp, runMultiAppWithHeaders } from "../../projectConfig";
import { computeBasePath } from "./capture";

function createCustomizationContainer(
  config: CustomizationCliContainerConfig,
): { container: CustomizationContainer; basePath: string } {
  const container = createCustomizationCliContainer(config);
  const basePath = computeBasePath(config.customizeFilePath);
  return { container, basePath };
}

async function runCustomizationApply(
  container: CustomizationContainer,
  basePath: string,
): Promise<void> {
  const s = p.spinner();
  s.start("Applying customization...");
  try {
    await applyCustomization({
      container,
      input: { basePath },
    });
  } catch (error) {
    s.stop("Apply failed.");
    throw error;
  }
  s.stop("Customization applied.");
}

async function runDiffPreview(
  config: CustomizationCliContainerConfig,
): Promise<{
  container: CustomizationContainer;
  basePath: string;
  hasChanges: boolean;
}> {
  const { container, basePath } = createCustomizationContainer(config);

  const s = p.spinner();
  s.start("Detecting changes...");
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

  return {
    container,
    basePath,
    hasChanges: !result.isEmpty,
  };
}

export default define({
  name: "apply",
  description: "Apply JS/CSS customization to kintone app",
  args: { ...customizeArgs, ...confirmArgs },
  run: async (ctx) => {
    try {
      const values = ctx.values as WithConfirm<CustomizeCliValues>;
      const skipConfirm = values.yes === true;

      await routeMultiApp(values, {
        singleLegacy: async () => {
          const config = resolveCustomizeConfig(values);
          const { container, basePath, hasChanges } =
            await runDiffPreview(config);

          if (!hasChanges) {
            p.log.success("No changes detected.");
            return;
          }

          if (!skipConfirm) {
            const shouldContinue = await p.confirm({
              message: "Apply these changes?",
            });

            if (p.isCancel(shouldContinue) || !shouldContinue) {
              p.cancel("Apply cancelled.");
              return;
            }
          }

          await runCustomizationApply(container, basePath);
          await confirmAndDeploy(
            [container],
            skipConfirm,
            "Customization applied and deployed successfully.",
          );
        },
        singleApp: async (app, projectConfig) => {
          const config = resolveCustomizeAppConfig(app, projectConfig, values);
          const { container, basePath, hasChanges } =
            await runDiffPreview(config);

          if (!hasChanges) {
            p.log.success("No changes detected.");
            return;
          }

          if (!skipConfirm) {
            const shouldContinue = await p.confirm({
              message: "Apply these changes?",
            });

            if (p.isCancel(shouldContinue) || !shouldContinue) {
              p.cancel("Apply cancelled.");
              return;
            }
          }

          await runCustomizationApply(container, basePath);
          await confirmAndDeploy(
            [container],
            skipConfirm,
            "Customization applied and deployed successfully.",
          );
        },
        multiApp: async (plan, projectConfig) => {
          // Phase 1: Detect diffs for all apps
          const appDiffResults: Array<{
            app: AppEntry;
            container: CustomizationContainer;
            basePath: string;
            hasChanges: boolean;
          }> = [];

          for (const app of plan.orderedApps) {
            const config = resolveCustomizeAppConfig(
              app,
              projectConfig,
              values,
            );
            printAppHeader(app.name, app.appId);
            const { container, basePath, hasChanges } =
              await runDiffPreview(config);
            appDiffResults.push({ app, container, basePath, hasChanges });
          }

          // Phase 2: Check if any app has changes
          const hasAnyChanges = appDiffResults.some((a) => a.hasChanges);
          if (!hasAnyChanges) {
            p.log.success("No changes detected in any app.");
            return;
          }

          // Phase 3: Confirm
          if (!skipConfirm) {
            const shouldContinue = await p.confirm({
              message: "Apply these changes to all apps?",
            });

            if (p.isCancel(shouldContinue) || !shouldContinue) {
              p.cancel("Apply cancelled.");
              return;
            }
          }

          // Phase 4: Apply only changed apps
          const containers: Deployable[] = [];
          await runMultiAppWithHeaders(plan, async (app) => {
            const entry = appDiffResults.find((a) => a.app.name === app.name);

            if (!entry) {
              throw new SystemError(
                SystemErrorCode.InternalServerError,
                `App container not found for "${app.name}"`,
              );
            }

            if (!entry.hasChanges) {
              p.log.info("No changes. Skipping.");
              return;
            }

            await runCustomizationApply(entry.container, entry.basePath);
            containers.push({
              appDeployer: entry.container.appDeployer,
              appName: app.name,
            });
          });

          // Phase 5: Deploy
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
