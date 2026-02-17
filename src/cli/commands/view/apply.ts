import * as p from "@clack/prompts";
import { define } from "gunshi";
import type { ViewContainer } from "@/core/application/container/view";
import {
  createViewCliContainer,
  type ViewCliContainerConfig,
} from "@/core/application/container/viewCli";
import { applyView } from "@/core/application/view/applyView";
import { confirmArgs } from "../../config";
import { handleCliError } from "../../handleError";
import { printAppHeader } from "../../output";
import { routeMultiApp, runMultiAppWithFailCheck } from "../../projectConfig";
import {
  resolveViewAppContainerConfig,
  resolveViewContainerConfig,
  type ViewCliValues,
  viewArgs,
} from "../../viewConfig";

async function runView(config: ViewCliContainerConfig): Promise<ViewContainer> {
  const container = createViewCliContainer(config);

  const s = p.spinner();
  s.start("Applying views...");
  const result = await applyView({ container });
  s.stop("Views applied.");

  if (result.skippedBuiltinViews.length > 0) {
    p.log.warn(
      `Skipped built-in views: ${result.skippedBuiltinViews.join(", ")}`,
    );
  }

  p.log.success("Views applied successfully.");

  return container;
}

async function confirmAndDeploy(
  containers: readonly ViewContainer[],
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

  p.log.success("Deployed to production.");
}

export default define({
  name: "apply",
  description: "Apply view settings from YAML to kintone app",
  args: { ...viewArgs, ...confirmArgs },
  run: async (ctx) => {
    try {
      const values = ctx.values as ViewCliValues & { yes?: boolean };
      const skipConfirm = values.yes === true;

      await routeMultiApp(values, {
        singleLegacy: async () => {
          const config = resolveViewContainerConfig(values);
          const container = await runView(config);
          await confirmAndDeploy([container], skipConfirm);
        },
        singleApp: async (app, projectConfig) => {
          const config = resolveViewAppContainerConfig(
            app,
            projectConfig,
            values,
          );
          const container = await runView(config);
          await confirmAndDeploy([container], skipConfirm);
        },
        multiApp: async (plan, projectConfig) => {
          const containers: ViewContainer[] = [];
          await runMultiAppWithFailCheck(
            plan,
            async (app) => {
              const config = resolveViewAppContainerConfig(
                app,
                projectConfig,
                values,
              );
              printAppHeader(app.name, app.appId);
              const container = await runView(config);
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
