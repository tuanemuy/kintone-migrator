import * as p from "@clack/prompts";
import { define } from "gunshi";
import pc from "picocolors";
import {
  createViewCliContainer,
  type ViewCliContainerConfig,
} from "@/core/application/container/viewCli";
import { captureView } from "@/core/application/view/captureView";
import { saveView } from "@/core/application/view/saveView";
import { handleCliError } from "../../handleError";
import { printAppHeader } from "../../output";
import { routeMultiApp, runMultiAppWithFailCheck } from "../../projectConfig";
import {
  resolveViewAppContainerConfig,
  resolveViewContainerConfig,
  type ViewCliValues,
  viewArgs,
} from "../../viewConfig";

async function runCaptureView(config: ViewCliContainerConfig): Promise<void> {
  const container = createViewCliContainer(config);

  const s = p.spinner();
  s.start("Capturing views...");
  const result = await captureView({ container });
  s.stop("Views captured.");

  await saveView({
    container,
    input: { configText: result.configText },
  });

  p.log.success(`Views saved to: ${pc.cyan(config.viewFilePath)}`);

  if (result.hasExistingConfig) {
    p.log.warn("Existing view file was overwritten.");
  }
}

export default define({
  name: "capture",
  description: "Capture current view settings from kintone app to file",
  args: viewArgs,
  run: async (ctx) => {
    try {
      const values = ctx.values as ViewCliValues;

      await routeMultiApp(values, {
        singleLegacy: async () => {
          const config = resolveViewContainerConfig(values);
          await runCaptureView(config);
        },
        singleApp: async (app, projectConfig) => {
          const config = resolveViewAppContainerConfig(
            app,
            projectConfig,
            values,
          );
          await runCaptureView(config);
        },
        multiApp: async (plan, projectConfig) => {
          await runMultiAppWithFailCheck(
            plan,
            async (app) => {
              const config = resolveViewAppContainerConfig(
                app,
                projectConfig,
                values,
              );
              printAppHeader(app.name, app.appId);
              await runCaptureView(config);
            },
            "All view captures completed successfully.",
          );
        },
      });
    } catch (error) {
      handleCliError(error);
    }
  },
});
