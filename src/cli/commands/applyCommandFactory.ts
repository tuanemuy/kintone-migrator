import * as p from "@clack/prompts";
import { type Args, define } from "gunshi";
import type {
  AppEntry,
  ProjectConfig,
} from "@/core/domain/projectConfig/entity";
import { confirmArgs, type WithConfirm } from "../config";
import { handleCliError } from "../handleError";
import { confirmAndDeploy, type Deployable } from "../output";
import type { MultiAppCliValues } from "../projectConfig";
import { routeMultiApp, runMultiAppWithHeaders } from "../projectConfig";

type ApplyCommandConfig<
  TContainerConfig,
  TContainer extends { appDeployer: Deployable["appDeployer"] },
  TCliValues extends MultiAppCliValues,
  TResult = void,
> = {
  readonly description: string;
  readonly args: Args;
  readonly spinnerMessage: string;
  readonly spinnerStopMessage: string;
  readonly successMessage: string;
  readonly createContainer: (config: TContainerConfig) => TContainer;
  readonly applyFn: (args: { container: TContainer }) => Promise<TResult>;
  readonly onResult?: (result: TResult) => void;
  readonly resolveContainerConfig: (values: TCliValues) => TContainerConfig;
  readonly resolveAppContainerConfig: (
    app: AppEntry,
    projectConfig: ProjectConfig,
    values: TCliValues,
  ) => TContainerConfig;
};

export function createApplyCommand<
  TContainerConfig,
  TContainer extends { appDeployer: Deployable["appDeployer"] },
  TCliValues extends MultiAppCliValues,
  TResult = void,
>(
  config: ApplyCommandConfig<TContainerConfig, TContainer, TCliValues, TResult>,
) {
  async function runApply(
    containerConfig: TContainerConfig,
  ): Promise<TContainer> {
    const container = config.createContainer(containerConfig);

    const s = p.spinner();
    s.start(config.spinnerMessage);
    let result: TResult;
    try {
      result = await config.applyFn({ container });
    } catch (error) {
      s.stop("Apply failed.");
      throw error;
    }
    s.stop(config.spinnerStopMessage);

    config.onResult?.(result);

    p.log.success(config.successMessage);

    return container;
  }

  return define({
    name: "apply",
    description: config.description,
    args: { ...config.args, ...confirmArgs },
    run: async (ctx) => {
      try {
        // gunshi's ctx.values is typed as Record<string, unknown>; cast is needed
        // because the generic TCliValues carries domain-specific CLI value types.
        const values = ctx.values as TCliValues;
        const skipConfirm =
          (ctx.values as WithConfirm<TCliValues>).yes === true;

        await routeMultiApp(values, {
          singleLegacy: async () => {
            const containerConfig = config.resolveContainerConfig(values);
            const container = await runApply(containerConfig);
            await confirmAndDeploy([container], skipConfirm);
          },
          singleApp: async (app, projectConfig) => {
            const containerConfig = config.resolveAppContainerConfig(
              app,
              projectConfig,
              values,
            );
            const container = await runApply(containerConfig);
            await confirmAndDeploy([container], skipConfirm);
          },
          multiApp: async (plan, projectConfig) => {
            const containers: Deployable[] = [];
            await runMultiAppWithHeaders(plan, async (app) => {
              const containerConfig = config.resolveAppContainerConfig(
                app,
                projectConfig,
                values,
              );
              const container = await runApply(containerConfig);
              containers.push({
                appDeployer: container.appDeployer,
                appName: app.name,
              });
            });
            await confirmAndDeploy(containers, skipConfirm);
          },
        });
      } catch (error) {
        handleCliError(error);
      }
    },
  });
}
