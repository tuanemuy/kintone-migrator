import * as p from "@clack/prompts";
import { type Args, define } from "gunshi";
import pc from "picocolors";
import type {
  AppEntry,
  ProjectConfig,
} from "@/core/domain/projectConfig/entity";
import { handleCliError } from "../handleError";
import { printAppHeader } from "../output";
import type { MultiAppCliValues } from "../projectConfig";
import { routeMultiApp, runMultiAppWithFailCheck } from "../projectConfig";

type CaptureCommandConfig<
  TContainerConfig,
  TContainer,
  TCliValues extends MultiAppCliValues,
> = {
  readonly description: string;
  readonly args: Args;
  readonly spinnerMessage: string;
  readonly spinnerStopMessage: string;
  readonly domainLabel: string;
  readonly multiAppSuccessMessage: string;
  readonly createContainer: (config: TContainerConfig) => TContainer;
  readonly captureFn: (args: {
    container: TContainer;
  }) => Promise<{ configText: string; hasExistingConfig: boolean }>;
  readonly saveFn: (args: {
    container: TContainer;
    input: { configText: string };
  }) => Promise<void>;
  readonly getConfigFilePath: (config: TContainerConfig) => string;
  readonly resolveContainerConfig: (values: TCliValues) => TContainerConfig;
  readonly resolveAppContainerConfig: (
    app: AppEntry,
    projectConfig: ProjectConfig,
    values: TCliValues,
  ) => TContainerConfig;
};

export function createCaptureCommand<
  TContainerConfig,
  TContainer,
  TCliValues extends MultiAppCliValues,
>(config: CaptureCommandConfig<TContainerConfig, TContainer, TCliValues>) {
  async function runCapture(containerConfig: TContainerConfig): Promise<void> {
    const container = config.createContainer(containerConfig);

    const s = p.spinner();
    s.start(config.spinnerMessage);
    let result: { configText: string; hasExistingConfig: boolean };
    try {
      result = await config.captureFn({ container });
    } catch (error) {
      s.stop("Capture failed.");
      throw error;
    }
    s.stop(config.spinnerStopMessage);

    await config.saveFn({
      container,
      input: { configText: result.configText },
    });

    p.log.success(
      `${config.domainLabel} saved to: ${pc.cyan(config.getConfigFilePath(containerConfig))}`,
    );

    if (result.hasExistingConfig) {
      p.log.warn(
        `Existing ${config.domainLabel.toLowerCase()} file was overwritten.`,
      );
    }
  }

  return define({
    name: "capture",
    description: config.description,
    args: config.args,
    run: async (ctx) => {
      try {
        const values = ctx.values as TCliValues;

        await routeMultiApp(values, {
          singleLegacy: async () => {
            const containerConfig = config.resolveContainerConfig(values);
            await runCapture(containerConfig);
          },
          singleApp: async (app, projectConfig) => {
            const containerConfig = config.resolveAppContainerConfig(
              app,
              projectConfig,
              values,
            );
            await runCapture(containerConfig);
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
                await runCapture(containerConfig);
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
