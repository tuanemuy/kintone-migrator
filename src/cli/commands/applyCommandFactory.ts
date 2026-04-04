import * as p from "@clack/prompts";
import { type Args, define } from "gunshi";
import { SystemError, SystemErrorCode } from "@/core/application/error";
import type { DiffResult } from "@/core/domain/diff";
import type {
  AppEntry,
  ProjectConfig,
} from "@/core/domain/projectConfig/entity";
import { confirmArgs, type WithConfirm } from "../config";
import { handleCliError } from "../handleError";
import { confirmAndDeploy, type Deployable, printAppHeader } from "../output";
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
  readonly diffPreview?: {
    readonly detectDiff: (args: {
      container: TContainer;
    }) => Promise<DiffResult<{ type: "added" | "modified" | "deleted" }>>;
    readonly printResult: (result: DiffResult<any>) => void;
  };
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
  async function runDiffPreview(
    containerConfig: TContainerConfig,
    diffPreview: NonNullable<typeof config.diffPreview>,
  ): Promise<{
    container: TContainer;
    hasChanges: boolean;
  }> {
    const container = config.createContainer(containerConfig);

    const s = p.spinner();
    s.start("Detecting changes...");
    let result: DiffResult<{ type: "added" | "modified" | "deleted" }>;
    try {
      result = await diffPreview.detectDiff({ container });
    } catch (error) {
      s.stop("Comparison failed.");
      throw error;
    }
    s.stop("Comparison complete.");

    diffPreview.printResult(result);

    return { container, hasChanges: !result.isEmpty };
  }

  async function runApply(
    containerConfig: TContainerConfig,
    existingContainer?: TContainer,
  ): Promise<TContainer> {
    const container =
      existingContainer ?? config.createContainer(containerConfig);

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

            if (config.diffPreview) {
              const { container, hasChanges } = await runDiffPreview(
                containerConfig,
                config.diffPreview,
              );

              if (!hasChanges) {
                p.log.success("No changes detected.");
                return;
              }

              if (!skipConfirm) {
                const shouldContinue = await p.confirm({
                  message: "Apply these changes?",
                });

                if (p.isCancel(shouldContinue) || !shouldContinue) {
                  p.cancel("Apply cancelled.");
                  return;
                }
              }

              const applied = await runApply(containerConfig, container);
              await confirmAndDeploy([applied], skipConfirm);
            } else {
              const container = await runApply(containerConfig);
              await confirmAndDeploy([container], skipConfirm);
            }
          },
          singleApp: async (app, projectConfig) => {
            const containerConfig = config.resolveAppContainerConfig(
              app,
              projectConfig,
              values,
            );

            if (config.diffPreview) {
              const { container, hasChanges } = await runDiffPreview(
                containerConfig,
                config.diffPreview,
              );

              if (!hasChanges) {
                p.log.success("No changes detected.");
                return;
              }

              if (!skipConfirm) {
                const shouldContinue = await p.confirm({
                  message: "Apply these changes?",
                });

                if (p.isCancel(shouldContinue) || !shouldContinue) {
                  p.cancel("Apply cancelled.");
                  return;
                }
              }

              const applied = await runApply(containerConfig, container);
              await confirmAndDeploy([applied], skipConfirm);
            } else {
              const container = await runApply(containerConfig);
              await confirmAndDeploy([container], skipConfirm);
            }
          },
          multiApp: async (plan, projectConfig) => {
            if (config.diffPreview) {
              // Phase 1: Detect diffs for all apps
              const appDiffResults: Array<{
                app: AppEntry;
                container: TContainer;
                hasChanges: boolean;
              }> = [];

              for (const app of plan.orderedApps) {
                const containerConfig = config.resolveAppContainerConfig(
                  app,
                  projectConfig,
                  values,
                );
                printAppHeader(app.name, app.appId);
                const { container, hasChanges } = await runDiffPreview(
                  containerConfig,
                  config.diffPreview,
                );
                appDiffResults.push({ app, container, hasChanges });
              }

              // Phase 2: Check if any app has changes
              const hasAnyChanges = appDiffResults.some((a) => a.hasChanges);
              if (!hasAnyChanges) {
                p.log.success("No changes detected in any app.");
                return;
              }

              // Phase 3: Confirm
              if (!skipConfirm) {
                const shouldContinue = await p.confirm({
                  message: "Apply these changes to all apps?",
                });

                if (p.isCancel(shouldContinue) || !shouldContinue) {
                  p.cancel("Apply cancelled.");
                  return;
                }
              }

              // Phase 4: Apply only changed apps
              const containers: Deployable[] = [];
              await runMultiAppWithHeaders(plan, async (app) => {
                const entry = appDiffResults.find(
                  (a) => a.app.name === app.name,
                );

                if (!entry) {
                  throw new SystemError(
                    SystemErrorCode.InternalServerError,
                    `App container not found for "${app.name}"`,
                  );
                }

                if (!entry.hasChanges) {
                  p.log.info("No changes. Skipping.");
                  return;
                }

                await runApply(
                  config.resolveAppContainerConfig(app, projectConfig, values),
                  entry.container,
                );
                containers.push({
                  appDeployer: entry.container.appDeployer,
                  appName: app.name,
                });
              });

              // Phase 5: Deploy
              await confirmAndDeploy(containers, skipConfirm);
            } else {
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
            }
          },
        });
      } catch (error) {
        handleCliError(error);
      }
    },
  });
}
