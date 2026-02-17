import * as p from "@clack/prompts";
import { define } from "gunshi";
import pc from "picocolors";
import {
  createProcessManagementCliContainer,
  type ProcessManagementCliContainerConfig,
} from "@/core/application/container/processManagementCli";
import { captureProcessManagement } from "@/core/application/processManagement/captureProcessManagement";
import { saveProcessManagement } from "@/core/application/processManagement/saveProcessManagement";
import { handleCliError } from "../../handleError";
import { printAppHeader } from "../../output";
import {
  type ProcessCliValues,
  processArgs,
  resolveProcessAppContainerConfig,
  resolveProcessContainerConfig,
} from "../../processConfig";
import { routeMultiApp, runMultiAppWithFailCheck } from "../../projectConfig";

async function runCaptureProcess(
  config: ProcessManagementCliContainerConfig,
): Promise<void> {
  const container = createProcessManagementCliContainer(config);

  const s = p.spinner();
  s.start("Capturing process management settings...");
  const result = await captureProcessManagement({ container });
  s.stop("Process management settings captured.");

  await saveProcessManagement({
    container,
    input: { configText: result.configText },
  });

  p.log.success(
    `Process management settings saved to: ${pc.cyan(config.processFilePath)}`,
  );

  if (result.hasExistingConfig) {
    p.log.warn("Existing process management file was overwritten.");
  }
}

export default define({
  name: "capture",
  description:
    "Capture current process management settings from kintone app to file",
  args: processArgs,
  run: async (ctx) => {
    try {
      const values = ctx.values as ProcessCliValues;

      await routeMultiApp(values, {
        singleLegacy: async () => {
          const config = resolveProcessContainerConfig(values);
          await runCaptureProcess(config);
        },
        singleApp: async (app, projectConfig) => {
          const config = resolveProcessAppContainerConfig(
            app,
            projectConfig,
            values,
          );
          await runCaptureProcess(config);
        },
        multiApp: async (plan, projectConfig) => {
          await runMultiAppWithFailCheck(
            plan,
            async (app) => {
              const config = resolveProcessAppContainerConfig(
                app,
                projectConfig,
                values,
              );
              printAppHeader(app.name, app.appId);
              await runCaptureProcess(config);
            },
            "All process management captures completed successfully.",
          );
        },
      });
    } catch (error) {
      handleCliError(error);
    }
  },
});
