import * as p from "@clack/prompts";
import { define } from "gunshi";
import {
  createFieldPermissionCliContainer,
  type FieldPermissionCliContainerConfig,
} from "@/core/application/container/cli";
import { applyFieldPermission } from "@/core/application/fieldPermission/applyFieldPermission";
import {
  type FieldAclCliValues,
  fieldAclArgs,
  resolveFieldAclAppContainerConfig,
  resolveFieldAclContainerConfig,
} from "../fieldAclConfig";
import { handleCliError } from "../handleError";
import { printAppHeader } from "../output";
import { routeMultiApp, runMultiAppWithFailCheck } from "../projectConfig";

async function runFieldAcl(
  config: FieldPermissionCliContainerConfig,
): Promise<void> {
  const container = createFieldPermissionCliContainer(config);

  const s = p.spinner();
  s.start("Applying field access permissions...");
  await applyFieldPermission({ container });
  s.stop("Field access permissions applied.");

  p.log.success("Field access permissions applied successfully.");
}

export default define({
  name: "field-acl",
  description: "Apply field access permissions from YAML to kintone app",
  args: fieldAclArgs,
  run: async (ctx) => {
    try {
      const values = ctx.values as FieldAclCliValues;

      await routeMultiApp(values, {
        singleLegacy: async () => {
          const config = resolveFieldAclContainerConfig(values);
          await runFieldAcl(config);
        },
        singleApp: async (app, projectConfig) => {
          const config = resolveFieldAclAppContainerConfig(
            app,
            projectConfig,
            values,
          );
          await runFieldAcl(config);
        },
        multiApp: async (plan, projectConfig) => {
          await runMultiAppWithFailCheck(
            plan,
            async (app) => {
              const config = resolveFieldAclAppContainerConfig(
                app,
                projectConfig,
                values,
              );
              printAppHeader(app.name, app.appId);
              await runFieldAcl(config);
            },
            "All field ACL applications completed successfully.",
          );
        },
      });
    } catch (error) {
      handleCliError(error);
    }
  },
});
