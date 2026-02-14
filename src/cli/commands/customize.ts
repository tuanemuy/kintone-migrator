import { dirname, resolve } from "node:path";
import * as p from "@clack/prompts";
import { define } from "gunshi";
import {
  type CustomizationCliContainerConfig,
  createCustomizationCliContainer,
} from "@/core/application/container/cli";
import type { CustomizationContainer } from "@/core/application/container/customization";
import { applyCustomization } from "@/core/application/customization/applyCustomization";
import type {
  AppEntry,
  ProjectConfig,
} from "@/core/domain/projectConfig/entity";
import {
  confirmArgs,
  kintoneArgs,
  multiAppArgs,
  resolveConfig,
} from "../config";
import { handleCliError } from "../handleError";
import { printAppHeader } from "../output";
import {
  type MultiAppCliValues,
  resolveAppCliConfig,
  routeMultiApp,
  runMultiAppWithFailCheck,
} from "../projectConfig";

const customizeArgs = {
  ...kintoneArgs,
  ...multiAppArgs,
  ...confirmArgs,
  "customize-file": {
    type: "string" as const,
    description: "Customization config file path (default: customize.yaml)",
  },
};

type CustomizeCliValues = MultiAppCliValues & {
  "customize-file"?: string;
};

function resolveCustomizeFilePath(
  cliValues: CustomizeCliValues,
  app?: AppEntry,
): string {
  return (
    cliValues["customize-file"] ??
    process.env.CUSTOMIZE_FILE_PATH ??
    (app ? `customize/${app.name}.yaml` : "customize.yaml")
  );
}

function resolveCustomizeConfig(
  cliValues: CustomizeCliValues,
): CustomizationCliContainerConfig {
  const config = resolveConfig(cliValues);
  return {
    baseUrl: config.baseUrl,
    auth: config.auth,
    appId: config.appId,
    guestSpaceId: config.guestSpaceId,
    customizeFilePath: resolveCustomizeFilePath(cliValues),
  };
}

function resolveCustomizeAppConfig(
  app: AppEntry,
  projectConfig: ProjectConfig,
  cliValues: CustomizeCliValues,
): CustomizationCliContainerConfig {
  const config = resolveAppCliConfig(app, projectConfig, cliValues);
  return {
    baseUrl: config.baseUrl,
    auth: config.auth,
    appId: config.appId,
    guestSpaceId: config.guestSpaceId,
    customizeFilePath: resolveCustomizeFilePath(cliValues, app),
  };
}

async function applyCustomizationForApp(
  config: CustomizationCliContainerConfig,
): Promise<CustomizationContainer> {
  const container = createCustomizationCliContainer(config);
  const basePath = dirname(resolve(config.customizeFilePath));

  const s = p.spinner();
  s.start("Applying customization...");
  await applyCustomization({
    container,
    input: { basePath },
  });
  s.stop("Customization applied.");

  return container;
}

async function confirmAndDeploy(
  containers: readonly CustomizationContainer[],
  skipConfirm: boolean,
): Promise<void> {
  if (!skipConfirm) {
    const shouldDeploy = await p.confirm({
      message: "Deploy to production?",
    });

    if (p.isCancel(shouldDeploy) || !shouldDeploy) {
      p.log.warn("Applied to preview, but not deployed to production.");
      return;
    }
  }

  const ds = p.spinner();
  ds.start("Deploying to production...");
  for (const container of containers) {
    await container.appDeployer.deploy();
  }
  ds.stop("Deployed to production.");

  p.log.success("Customization applied and deployed successfully.");
}

export default define({
  name: "customize",
  description: "Apply JS/CSS customization to kintone app",
  args: customizeArgs,
  run: async (ctx) => {
    try {
      const values = ctx.values as CustomizeCliValues;
      const skipConfirm = ctx.values.yes === true;

      await routeMultiApp(values, {
        singleLegacy: async () => {
          const config = resolveCustomizeConfig(values);
          const container = await applyCustomizationForApp(config);
          await confirmAndDeploy([container], skipConfirm);
        },
        singleApp: async (app, projectConfig) => {
          const config = resolveCustomizeAppConfig(app, projectConfig, values);
          const container = await applyCustomizationForApp(config);
          await confirmAndDeploy([container], skipConfirm);
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
          await confirmAndDeploy(containers, skipConfirm);
        },
      });
    } catch (error) {
      handleCliError(error);
    }
  },
});
