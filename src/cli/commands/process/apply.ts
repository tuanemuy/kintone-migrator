import * as p from "@clack/prompts";
import { define } from "gunshi";
import type { ProcessManagementContainer } from "@/core/application/container/processManagement";
import {
  createProcessManagementCliContainer,
  type ProcessManagementCliContainerConfig,
} from "@/core/application/container/processManagementCli";
import { applyProcessManagement } from "@/core/application/processManagement/applyProcessManagement";
import { confirmArgs } from "../../config";
import { handleCliError } from "../../handleError";
import { printAppHeader } from "../../output";
import {
  type ProcessCliValues,
  processArgs,
  resolveProcessAppContainerConfig,
  resolveProcessContainerConfig,
} from "../../processConfig";
import { routeMultiApp, runMultiAppWithFailCheck } from "../../projectConfig";

async function runProcessApply(
  config: ProcessManagementCliContainerConfig,
): Promise<ProcessManagementContainer> {
  const container = createProcessManagementCliContainer(config);

  const s = p.spinner();
  s.start("Applying process management settings...");
  const result = await applyProcessManagement({ container });
  s.stop("Process management settings applied.");

  if (result.enableChanged) {
    p.log.warn(
      result.newEnable
        ? "Process management will be ENABLED. This activates workflow processing for this app."
        : "Process management will be DISABLED. This deactivates workflow processing for this app.",
    );
  }

  p.log.success("Process management settings applied successfully.");

  return container;
}

async function confirmAndDeploy(
  containers: readonly ProcessManagementContainer[],
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
  description: "Apply process management settings from YAML to kintone app",
  args: { ...processArgs, ...confirmArgs },
  run: async (ctx) => {
    try {
      const values = ctx.values as ProcessCliValues & { yes?: boolean };
      const skipConfirm = values.yes === true;

      await routeMultiApp(values, {
        singleLegacy: async () => {
          const config = resolveProcessContainerConfig(values);
          const container = await runProcessApply(config);
          await confirmAndDeploy([container], skipConfirm);
        },
        singleApp: async (app, projectConfig) => {
          const config = resolveProcessAppContainerConfig(
            app,
            projectConfig,
            values,
          );
          const container = await runProcessApply(config);
          await confirmAndDeploy([container], skipConfirm);
        },
        multiApp: async (plan, projectConfig) => {
          const containers: ProcessManagementContainer[] = [];
          await runMultiAppWithFailCheck(
            plan,
            async (app) => {
              const config = resolveProcessAppContainerConfig(
                app,
                projectConfig,
                values,
              );
              printAppHeader(app.name, app.appId);
              const container = await runProcessApply(config);
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
