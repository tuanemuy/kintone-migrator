import * as p from "@clack/prompts";
import { define } from "gunshi";
import pc from "picocolors";
import {
  createFieldPermissionCliContainer,
  type FieldPermissionCliContainerConfig,
} from "@/core/application/container/cli";
import { captureFieldPermission } from "@/core/application/fieldPermission/captureFieldPermission";
import { saveFieldPermission } from "@/core/application/fieldPermission/saveFieldPermission";
import {
  type FieldAclCliValues,
  fieldAclArgs,
  resolveFieldAclAppContainerConfig,
  resolveFieldAclContainerConfig,
} from "../../fieldAclConfig";
import { handleCliError } from "../../handleError";
import { printAppHeader } from "../../output";
import { routeMultiApp, runMultiAppWithFailCheck } from "../../projectConfig";

async function runCaptureFieldAcl(
  config: FieldPermissionCliContainerConfig,
): Promise<void> {
  const container = createFieldPermissionCliContainer(config);

  const s = p.spinner();
  s.start("Capturing field access permissions...");
  const result = await captureFieldPermission({ container });
  s.stop("Field access permissions captured.");

  await saveFieldPermission({
    container,
    input: { configText: result.configText },
  });

  p.log.success(`Field ACL saved to: ${pc.cyan(config.fieldAclFilePath)}`);

  if (result.hasExistingConfig) {
    p.log.warn("Existing field ACL file was overwritten.");
  }
}

export default define({
  name: "capture",
  description:
    "Capture current field access permissions from kintone app to file",
  args: fieldAclArgs,
  run: async (ctx) => {
    try {
      const values = ctx.values as FieldAclCliValues;

      await routeMultiApp(values, {
        singleLegacy: async () => {
          const config = resolveFieldAclContainerConfig(values);
          await runCaptureFieldAcl(config);
        },
        singleApp: async (app, projectConfig) => {
          const config = resolveFieldAclAppContainerConfig(
            app,
            projectConfig,
            values,
          );
          await runCaptureFieldAcl(config);
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
              await runCaptureFieldAcl(config);
            },
            "All field ACL captures completed successfully.",
          );
        },
      });
    } catch (error) {
      handleCliError(error);
    }
  },
});
