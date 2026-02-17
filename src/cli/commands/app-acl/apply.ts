import * as p from "@clack/prompts";
import { define } from "gunshi";
import { applyAppPermission } from "@/core/application/appPermission/applyAppPermission";
import type { AppPermissionContainer } from "@/core/application/container/appPermission";
import {
  type AppPermissionCliContainerConfig,
  createAppPermissionCliContainer,
} from "@/core/application/container/appPermissionCli";
import {
  type AppAclCliValues,
  appAclArgs,
  resolveAppAclAppContainerConfig,
  resolveAppAclContainerConfig,
} from "../../appAclConfig";
import { confirmArgs } from "../../config";
import { handleCliError } from "../../handleError";
import { printAppHeader } from "../../output";
import { routeMultiApp, runMultiAppWithFailCheck } from "../../projectConfig";

async function runAppAcl(
  config: AppPermissionCliContainerConfig,
): Promise<AppPermissionContainer> {
  const container = createAppPermissionCliContainer(config);

  const s = p.spinner();
  s.start("Applying app access permissions...");
  await applyAppPermission({ container });
  s.stop("App access permissions applied.");

  p.log.success("App access permissions applied successfully.");

  return container;
}

async function confirmAndDeploy(
  containers: readonly AppPermissionContainer[],
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
  description: "Apply app access permissions from YAML to kintone app",
  args: { ...appAclArgs, ...confirmArgs },
  run: async (ctx) => {
    try {
      const values = ctx.values as AppAclCliValues & { yes?: boolean };
      const skipConfirm = values.yes === true;

      await routeMultiApp(values, {
        singleLegacy: async () => {
          const config = resolveAppAclContainerConfig(values);
          const container = await runAppAcl(config);
          await confirmAndDeploy([container], skipConfirm);
        },
        singleApp: async (app, projectConfig) => {
          const config = resolveAppAclAppContainerConfig(
            app,
            projectConfig,
            values,
          );
          const container = await runAppAcl(config);
          await confirmAndDeploy([container], skipConfirm);
        },
        multiApp: async (plan, projectConfig) => {
          const containers: AppPermissionContainer[] = [];
          await runMultiAppWithFailCheck(
            plan,
            async (app) => {
              const config = resolveAppAclAppContainerConfig(
                app,
                projectConfig,
                values,
              );
              printAppHeader(app.name, app.appId);
              const container = await runAppAcl(config);
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
