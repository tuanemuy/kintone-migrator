import * as p from "@clack/prompts";
import { define } from "gunshi";
import type { ProcessManagementContainer } from "@/core/application/container/processManagement";
import {
  createProcessManagementCliContainer,
  type ProcessManagementCliContainerConfig,
} from "@/core/application/container/processManagementCli";
import { applyProcessManagement } from "@/core/application/processManagement/applyProcessManagement";
import { confirmArgs, type WithConfirm } from "../../config";
import { handleCliError } from "../../handleError";
import { confirmAndDeploy } from "../../output";
import {
  type ProcessCliValues,
  processArgs,
  resolveProcessAppContainerConfig,
  resolveProcessContainerConfig,
} from "../../processConfig";
import { routeMultiApp, runMultiAppWithHeaders } from "../../projectConfig";

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

export default define({
  name: "apply",
  description: "Apply process management settings from YAML to kintone app",
  args: { ...processArgs, ...confirmArgs },
  run: async (ctx) => {
    try {
      const values = ctx.values as WithConfirm<ProcessCliValues>;
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
          await runMultiAppWithHeaders(plan, async (app) => {
            const config = resolveProcessAppContainerConfig(
              app,
              projectConfig,
              values,
            );
            const container = await runProcessApply(config);
            containers.push(container);
          });
          await confirmAndDeploy(containers, skipConfirm);
        },
      });
    } catch (error) {
      handleCliError(error);
    }
  },
});
