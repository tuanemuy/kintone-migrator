import * as p from "@clack/prompts";
import { define } from "gunshi";
import type { FieldPermissionContainer } from "@/core/application/container/fieldPermission";
import {
  createFieldPermissionCliContainer,
  type FieldPermissionCliContainerConfig,
} from "@/core/application/container/fieldPermissionCli";
import { applyFieldPermission } from "@/core/application/fieldPermission/applyFieldPermission";
import { confirmArgs } from "../../config";
import {
  type FieldAclCliValues,
  fieldAclArgs,
  resolveFieldAclAppContainerConfig,
  resolveFieldAclContainerConfig,
} from "../../fieldAclConfig";
import { handleCliError } from "../../handleError";
import { confirmAndDeploy, printAppHeader } from "../../output";
import { routeMultiApp, runMultiAppWithFailCheck } from "../../projectConfig";

async function runFieldAcl(
  config: FieldPermissionCliContainerConfig,
): Promise<FieldPermissionContainer> {
  const container = createFieldPermissionCliContainer(config);

  const s = p.spinner();
  s.start("Applying field access permissions...");
  await applyFieldPermission({ container });
  s.stop("Field access permissions applied.");

  p.log.success("Field access permissions applied successfully.");

  return container;
}

export default define({
  name: "apply",
  description: "Apply field access permissions from YAML to kintone app",
  args: { ...fieldAclArgs, ...confirmArgs },
  run: async (ctx) => {
    try {
      const values = ctx.values as FieldAclCliValues & { yes?: boolean };
      const skipConfirm = values.yes === true;

      await routeMultiApp(values, {
        singleLegacy: async () => {
          const config = resolveFieldAclContainerConfig(values);
          const container = await runFieldAcl(config);
          await confirmAndDeploy([container], skipConfirm);
        },
        singleApp: async (app, projectConfig) => {
          const config = resolveFieldAclAppContainerConfig(
            app,
            projectConfig,
            values,
          );
          const container = await runFieldAcl(config);
          await confirmAndDeploy([container], skipConfirm);
        },
        multiApp: async (plan, projectConfig) => {
          const containers: FieldPermissionContainer[] = [];
          await runMultiAppWithFailCheck(
            plan,
            async (app) => {
              const config = resolveFieldAclAppContainerConfig(
                app,
                projectConfig,
                values,
              );
              printAppHeader(app.name, app.appId);
              const container = await runFieldAcl(config);
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
