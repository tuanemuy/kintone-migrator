import * as p from "@clack/prompts";
import { define } from "gunshi";
import type { ViewContainer } from "@/core/application/container/view";
import {
  createViewCliContainer,
  type ViewCliContainerConfig,
} from "@/core/application/container/viewCli";
import { applyView } from "@/core/application/view/applyView";
import { confirmArgs, type WithConfirm } from "../../config";
import { handleCliError } from "../../handleError";
import { confirmAndDeploy } from "../../output";
import { routeMultiApp, runMultiAppWithHeaders } from "../../projectConfig";
import {
  resolveViewAppContainerConfig,
  resolveViewContainerConfig,
  type ViewCliValues,
  viewArgs,
} from "../../viewConfig";

async function runView(config: ViewCliContainerConfig): Promise<ViewContainer> {
  const container = createViewCliContainer(config);

  const s = p.spinner();
  s.start("Applying views...");
  const result = await applyView({ container });
  s.stop("Views applied.");

  if (result.skippedBuiltinViews.length > 0) {
    p.log.warn(
      `Skipped built-in views: ${result.skippedBuiltinViews.join(", ")}`,
    );
  }

  p.log.success("Views applied successfully.");

  return container;
}

export default define({
  name: "apply",
  description: "Apply view settings from YAML to kintone app",
  args: { ...viewArgs, ...confirmArgs },
  run: async (ctx) => {
    try {
      const values = ctx.values as WithConfirm<ViewCliValues>;
      const skipConfirm = values.yes === true;

      await routeMultiApp(values, {
        singleLegacy: async () => {
          const config = resolveViewContainerConfig(values);
          const container = await runView(config);
          await confirmAndDeploy([container], skipConfirm);
        },
        singleApp: async (app, projectConfig) => {
          const config = resolveViewAppContainerConfig(
            app,
            projectConfig,
            values,
          );
          const container = await runView(config);
          await confirmAndDeploy([container], skipConfirm);
        },
        multiApp: async (plan, projectConfig) => {
          const containers: ViewContainer[] = [];
          await runMultiAppWithHeaders(plan, async (app) => {
            const config = resolveViewAppContainerConfig(
              app,
              projectConfig,
              values,
            );
            const container = await runView(config);
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
