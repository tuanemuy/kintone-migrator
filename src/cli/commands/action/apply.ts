import * as p from "@clack/prompts";
import { define } from "gunshi";
import { applyAction } from "@/core/application/action/applyAction";
import type { ActionContainer } from "@/core/application/container/action";
import type { ActionCliContainerConfig } from "@/core/application/container/actionCli";
import { createActionCliContainer } from "@/core/application/container/actionCli";
import {
  type ActionCliValues,
  actionArgs,
  resolveActionAppContainerConfig,
  resolveActionContainerConfig,
} from "../../actionConfig";
import { confirmArgs } from "../../config";
import { handleCliError } from "../../handleError";
import { confirmAndDeploy, printAppHeader } from "../../output";
import { routeMultiApp, runMultiAppWithFailCheck } from "../../projectConfig";

async function runAction(
  config: ActionCliContainerConfig,
): Promise<ActionContainer> {
  const container = createActionCliContainer(config);

  const s = p.spinner();
  s.start("Applying action settings...");
  await applyAction({ container });
  s.stop("Action settings applied.");

  p.log.success("Action settings applied successfully.");

  return container;
}

export default define({
  name: "apply",
  description: "Apply action settings from YAML to kintone app",
  args: { ...actionArgs, ...confirmArgs },
  run: async (ctx) => {
    try {
      const values = ctx.values as ActionCliValues & { yes?: boolean };
      const skipConfirm = values.yes === true;

      await routeMultiApp(values, {
        singleLegacy: async () => {
          const config = resolveActionContainerConfig(values);
          const container = await runAction(config);
          await confirmAndDeploy([container], skipConfirm);
        },
        singleApp: async (app, projectConfig) => {
          const config = resolveActionAppContainerConfig(
            app,
            projectConfig,
            values,
          );
          const container = await runAction(config);
          await confirmAndDeploy([container], skipConfirm);
        },
        multiApp: async (plan, projectConfig) => {
          const containers: ActionContainer[] = [];
          await runMultiAppWithFailCheck(
            plan,
            async (app) => {
              const config = resolveActionAppContainerConfig(
                app,
                projectConfig,
                values,
              );
              printAppHeader(app.name, app.appId);
              const container = await runAction(config);
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
