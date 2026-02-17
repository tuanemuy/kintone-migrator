import * as p from "@clack/prompts";
import { define } from "gunshi";
import { applyAdminNotes } from "@/core/application/adminNotes/applyAdminNotes";
import type { AdminNotesContainer } from "@/core/application/container/adminNotes";
import {
  type AdminNotesCliContainerConfig,
  createAdminNotesCliContainer,
} from "@/core/application/container/adminNotesCli";
import {
  type AdminNotesCliValues,
  adminNotesArgs,
  resolveAdminNotesAppContainerConfig,
  resolveAdminNotesContainerConfig,
} from "../../adminNotesConfig";
import { confirmArgs } from "../../config";
import { handleCliError } from "../../handleError";
import { printAppHeader } from "../../output";
import { routeMultiApp, runMultiAppWithFailCheck } from "../../projectConfig";

async function runAdminNotes(
  config: AdminNotesCliContainerConfig,
): Promise<AdminNotesContainer> {
  const container = createAdminNotesCliContainer(config);

  const s = p.spinner();
  s.start("Applying admin notes...");
  await applyAdminNotes({ container });
  s.stop("Admin notes applied.");

  p.log.success("Admin notes applied successfully.");

  return container;
}

async function confirmAndDeploy(
  containers: readonly AdminNotesContainer[],
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
  description: "Apply admin notes from YAML to kintone app",
  args: { ...adminNotesArgs, ...confirmArgs },
  run: async (ctx) => {
    try {
      const values = ctx.values as AdminNotesCliValues & { yes?: boolean };
      const skipConfirm = values.yes === true;

      await routeMultiApp(values, {
        singleLegacy: async () => {
          const config = resolveAdminNotesContainerConfig(values);
          const container = await runAdminNotes(config);
          await confirmAndDeploy([container], skipConfirm);
        },
        singleApp: async (app, projectConfig) => {
          const config = resolveAdminNotesAppContainerConfig(
            app,
            projectConfig,
            values,
          );
          const container = await runAdminNotes(config);
          await confirmAndDeploy([container], skipConfirm);
        },
        multiApp: async (plan, projectConfig) => {
          const containers: AdminNotesContainer[] = [];
          await runMultiAppWithFailCheck(
            plan,
            async (app) => {
              const config = resolveAdminNotesAppContainerConfig(
                app,
                projectConfig,
                values,
              );
              printAppHeader(app.name, app.appId);
              const container = await runAdminNotes(config);
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
