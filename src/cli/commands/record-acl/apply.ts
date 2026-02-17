import * as p from "@clack/prompts";
import { define } from "gunshi";
import type { RecordPermissionContainer } from "@/core/application/container/recordPermission";
import type { RecordPermissionCliContainerConfig } from "@/core/application/container/recordPermissionCli";
import { createRecordPermissionCliContainer } from "@/core/application/container/recordPermissionCli";
import { applyRecordPermission } from "@/core/application/recordPermission/applyRecordPermission";
import { confirmArgs } from "../../config";
import { handleCliError } from "../../handleError";
import { printAppHeader } from "../../output";
import { routeMultiApp, runMultiAppWithFailCheck } from "../../projectConfig";
import {
  type RecordAclCliValues,
  recordAclArgs,
  resolveRecordAclAppContainerConfig,
  resolveRecordAclContainerConfig,
} from "../../recordAclConfig";

async function runRecordAcl(
  config: RecordPermissionCliContainerConfig,
): Promise<RecordPermissionContainer> {
  const container = createRecordPermissionCliContainer(config);

  const s = p.spinner();
  s.start("Applying record access permissions...");
  await applyRecordPermission({ container });
  s.stop("Record access permissions applied.");

  p.log.success("Record access permissions applied successfully.");

  return container;
}

async function confirmAndDeploy(
  containers: readonly RecordPermissionContainer[],
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
  description: "Apply record access permissions from YAML to kintone app",
  args: { ...recordAclArgs, ...confirmArgs },
  run: async (ctx) => {
    try {
      const values = ctx.values as RecordAclCliValues & { yes?: boolean };
      const skipConfirm = values.yes === true;

      await routeMultiApp(values, {
        singleLegacy: async () => {
          const config = resolveRecordAclContainerConfig(values);
          const container = await runRecordAcl(config);
          await confirmAndDeploy([container], skipConfirm);
        },
        singleApp: async (app, projectConfig) => {
          const config = resolveRecordAclAppContainerConfig(
            app,
            projectConfig,
            values,
          );
          const container = await runRecordAcl(config);
          await confirmAndDeploy([container], skipConfirm);
        },
        multiApp: async (plan, projectConfig) => {
          const containers: RecordPermissionContainer[] = [];
          await runMultiAppWithFailCheck(
            plan,
            async (app) => {
              const config = resolveRecordAclAppContainerConfig(
                app,
                projectConfig,
                values,
              );
              printAppHeader(app.name, app.appId);
              const container = await runRecordAcl(config);
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
