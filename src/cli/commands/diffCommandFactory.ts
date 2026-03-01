import * as p from "@clack/prompts";
import { type Args, define } from "gunshi";
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
  TContainer,
  TCliValues extends MultiAppCliValues,
  TEntry extends { type: "added" | "modified" | "deleted" },
> = {
  readonly description: string;
  readonly args: Args;
  readonly spinnerMessage: string;
  readonly multiAppSuccessMessage?: string;
  readonly createContainer: (config: TContainerConfig) => TContainer;
  readonly detectDiff: (args: {
    container: TContainer;
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
  TContainer,
  TCliValues extends MultiAppCliValues,
  TEntry extends { type: "added" | "modified" | "deleted" },
>(config: DiffCommandConfig<TContainerConfig, TContainer, TCliValues, TEntry>) {
  async function runDiff(containerConfig: TContainerConfig): Promise<void> {
    const container = config.createContainer(containerConfig);

    const s = p.spinner();
    s.start(config.spinnerMessage);
    let result: DiffResult<TEntry>;
    try {
      result = await config.detectDiff({ container });
    } catch (error) {
      s.stop("Comparison failed.");
      throw error;
    }
    s.stop("Comparison complete.");

    config.printResult(result);
  }

  return define({
    name: "diff",
    description: config.description,
    args: config.args,
    run: async (ctx) => {
      try {
        // gunshi's ctx.values is typed as Record<string, unknown>; cast is needed
        // because the generic TCliValues carries domain-specific CLI value types.
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
            await runMultiAppWithFailCheck(
              plan,
              async (app) => {
                const containerConfig = config.resolveAppContainerConfig(
                  app,
                  projectConfig,
                  values,
                );
                printAppHeader(app.name, app.appId);
                await runDiff(containerConfig);
              },
              config.multiAppSuccessMessage,
            );
          },
        });
      } catch (error) {
        handleCliError(error);
      }
    },
  });
}
