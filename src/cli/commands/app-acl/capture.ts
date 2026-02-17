import * as p from "@clack/prompts";
import { define } from "gunshi";
import pc from "picocolors";
import { captureAppPermission } from "@/core/application/appPermission/captureAppPermission";
import { saveAppPermission } from "@/core/application/appPermission/saveAppPermission";
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
import { handleCliError } from "../../handleError";
import { printAppHeader } from "../../output";
import { routeMultiApp, runMultiAppWithFailCheck } from "../../projectConfig";

async function runCaptureAppAcl(
  config: AppPermissionCliContainerConfig,
): Promise<void> {
  const container = createAppPermissionCliContainer(config);

  const s = p.spinner();
  s.start("Capturing app access permissions...");
  const result = await captureAppPermission({ container });
  s.stop("App access permissions captured.");

  await saveAppPermission({
    container,
    input: { configText: result.configText },
  });

  p.log.success(`App ACL saved to: ${pc.cyan(config.appAclFilePath)}`);

  if (result.hasExistingConfig) {
    p.log.warn("Existing app ACL file was overwritten.");
  }
}

export default define({
  name: "capture",
  description:
    "Capture current app access permissions from kintone app to file",
  args: appAclArgs,
  run: async (ctx) => {
    try {
      const values = ctx.values as AppAclCliValues;

      await routeMultiApp(values, {
        singleLegacy: async () => {
          const config = resolveAppAclContainerConfig(values);
          await runCaptureAppAcl(config);
        },
        singleApp: async (app, projectConfig) => {
          const config = resolveAppAclAppContainerConfig(
            app,
            projectConfig,
            values,
          );
          await runCaptureAppAcl(config);
        },
        multiApp: async (plan, projectConfig) => {
          await runMultiAppWithFailCheck(
            plan,
            async (app) => {
              const config = resolveAppAclAppContainerConfig(
                app,
                projectConfig,
                values,
              );
              printAppHeader(app.name, app.appId);
              await runCaptureAppAcl(config);
            },
            "All app ACL captures completed successfully.",
          );
        },
      });
    } catch (error) {
      handleCliError(error);
    }
  },
});
