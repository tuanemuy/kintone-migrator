import * as p from "@clack/prompts";
import { define } from "gunshi";
import pc from "picocolors";
import { captureAction } from "@/core/application/action/captureAction";
import { saveAction } from "@/core/application/action/saveAction";
import type { ActionCliContainerConfig } from "@/core/application/container/actionCli";
import { createActionCliContainer } from "@/core/application/container/actionCli";
import {
  type ActionCliValues,
  actionArgs,
  resolveActionAppContainerConfig,
  resolveActionContainerConfig,
} from "../../actionConfig";
import { handleCliError } from "../../handleError";
import { printAppHeader } from "../../output";
import { routeMultiApp, runMultiAppWithFailCheck } from "../../projectConfig";

async function runCaptureAction(
  config: ActionCliContainerConfig,
): Promise<void> {
  const container = createActionCliContainer(config);

  const s = p.spinner();
  s.start("Capturing action settings...");
  const result = await captureAction({ container });
  s.stop("Action settings captured.");

  await saveAction({
    container,
    input: { configText: result.configText },
  });

  p.log.success(`Action settings saved to: ${pc.cyan(config.actionFilePath)}`);

  if (result.hasExistingConfig) {
    p.log.warn("Existing action file was overwritten.");
  }
}

export default define({
  name: "capture",
  description: "Capture current action settings from kintone app to file",
  args: actionArgs,
  run: async (ctx) => {
    try {
      const values = ctx.values as ActionCliValues;

      await routeMultiApp(values, {
        singleLegacy: async () => {
          const config = resolveActionContainerConfig(values);
          await runCaptureAction(config);
        },
        singleApp: async (app, projectConfig) => {
          const config = resolveActionAppContainerConfig(
            app,
            projectConfig,
            values,
          );
          await runCaptureAction(config);
        },
        multiApp: async (plan, projectConfig) => {
          await runMultiAppWithFailCheck(
            plan,
            async (app) => {
              const config = resolveActionAppContainerConfig(
                app,
                projectConfig,
                values,
              );
              printAppHeader(app.name, app.appId);
              await runCaptureAction(config);
            },
            "All action captures completed successfully.",
          );
        },
      });
    } catch (error) {
      handleCliError(error);
    }
  },
});
