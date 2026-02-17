import * as p from "@clack/prompts";
import { define } from "gunshi";
import {
  createProcessManagementCliContainer,
  type ProcessManagementCliContainerConfig,
} from "@/core/application/container/processManagementCli";
import { diffProcessManagement } from "@/core/application/processManagement/diffProcessManagement";
import { handleCliError } from "../../handleError";
import { printAppHeader, printProcessDiffResult } from "../../output";
import {
  type ProcessCliValues,
  processArgs,
  resolveProcessAppContainerConfig,
  resolveProcessContainerConfig,
} from "../../processConfig";
import { routeMultiApp, runMultiAppWithFailCheck } from "../../projectConfig";

async function runDiffProcess(
  config: ProcessManagementCliContainerConfig,
): Promise<void> {
  const container = createProcessManagementCliContainer(config);

  const s = p.spinner();
  s.start("Comparing process management settings...");
  const result = await diffProcessManagement({ container });
  s.stop("Comparison complete.");

  printProcessDiffResult(result);
}

export default define({
  name: "diff",
  description:
    "Compare local process management settings with remote kintone app",
  args: processArgs,
  run: async (ctx) => {
    try {
      const values = ctx.values as ProcessCliValues;

      await routeMultiApp(values, {
        singleLegacy: async () => {
          const config = resolveProcessContainerConfig(values);
          await runDiffProcess(config);
        },
        singleApp: async (app, projectConfig) => {
          const config = resolveProcessAppContainerConfig(
            app,
            projectConfig,
            values,
          );
          await runDiffProcess(config);
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
              await runDiffProcess(config);
            },
            "All process management diffs completed successfully.",
          );
        },
      });
    } catch (error) {
      handleCliError(error);
    }
  },
});
