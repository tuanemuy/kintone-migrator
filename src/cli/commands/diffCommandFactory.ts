import * as p from "@clack/prompts";
import { define } from "gunshi";
import type { DiffResult } from "@/core/domain/diff";
import type {
  AppEntry,
  ProjectConfig,
} from "@/core/domain/projectConfig/entity";
import { handleCliError } from "../handleError";
import { printAppHeader } from "../output";
import type { MultiAppCliValues } from "../projectConfig";
import { routeMultiApp, runMultiAppWithFailCheck } from "../projectConfig";

type DiffCommandConfig<
  TContainerConfig,
  TCliValues extends MultiAppCliValues,
  TEntry extends { type: string },
> = {
  readonly description: string;
  readonly args: Record<string, unknown>;
  readonly spinnerMessage: string;
  readonly createContainer: (config: TContainerConfig) => unknown;
  readonly detectDiff: (args: {
    container: never;
  }) => Promise<DiffResult<TEntry>>;
  readonly printResult: (result: DiffResult<TEntry>) => void;
  readonly resolveContainerConfig: (values: TCliValues) => TContainerConfig;
  readonly resolveAppContainerConfig: (
    app: AppEntry,
    projectConfig: ProjectConfig,
    values: TCliValues,
  ) => TContainerConfig;
};

export function createDiffCommand<
  TContainerConfig,
  TCliValues extends MultiAppCliValues,
  TEntry extends { type: string },
>(config: DiffCommandConfig<TContainerConfig, TCliValues, TEntry>) {
  async function runDiff(containerConfig: TContainerConfig): Promise<void> {
    const container = config.createContainer(containerConfig);

    const s = p.spinner();
    s.start(config.spinnerMessage);
    const result = await config.detectDiff({
      container: container as never,
    });
    s.stop("Comparison complete.");

    config.printResult(result);
  }

  return define({
    name: "diff",
    description: config.description,
    args: config.args,
    run: async (ctx) => {
      try {
        const values = ctx.values as TCliValues;

        await routeMultiApp(values, {
          singleLegacy: async () => {
            const containerConfig = config.resolveContainerConfig(values);
            await runDiff(containerConfig);
          },
          singleApp: async (app, projectConfig) => {
            const containerConfig = config.resolveAppContainerConfig(
              app,
              projectConfig,
              values,
            );
            await runDiff(containerConfig);
          },
          multiApp: async (plan, projectConfig) => {
            await runMultiAppWithFailCheck(plan, async (app) => {
              const containerConfig = config.resolveAppContainerConfig(
                app,
                projectConfig,
                values,
              );
              printAppHeader(app.name, app.appId);
              await runDiff(containerConfig);
            });
          },
        });
      } catch (error) {
        handleCliError(error);
      }
    },
  });
}
