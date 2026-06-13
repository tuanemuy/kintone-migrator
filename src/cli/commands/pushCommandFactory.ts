import * as p from "@clack/prompts";
import { type Args, define } from "gunshi";
import {
  ConflictError,
  ConflictErrorCode,
  isConflictError,
  ValidationError,
  ValidationErrorCode,
} from "@/core/application/error";
import type {
  AppEntry,
  ProjectConfig,
} from "@/core/domain/projectConfig/entity";
import { confirmArgs, type WithConfirm } from "../config";
import { handleCliError } from "../handleError";
import { confirmAndDeploy, type Deployable } from "../output";
import type { MultiAppCliValues } from "../projectConfig";
import { routeMultiApp } from "../projectConfig";

export type PushInput = { readonly force?: boolean };

type PushCommandConfig<
  TContainerConfig,
  TContainer extends { appDeployer: Deployable["appDeployer"] },
  TCliValues extends MultiAppCliValues,
  TResult,
> = {
  readonly description: string;
  readonly args: Args;
  /** Label used in confirm/spinner messages, e.g. "view config". */
  readonly subject: string;
  /** The kintone resource pushed, e.g. "views". */
  readonly spinnerStopMessage: string;
  readonly createContainer: (config: TContainerConfig) => TContainer;
  readonly pushFn: (args: {
    container: TContainer;
    input: PushInput;
  }) => Promise<TResult>;
  /**
   * Re-wrapped TOCTOU message thrown when the apply hits an API optimistic-lock
   * conflict (distinct from snapshot drift, which is tagged with `ConfigDrift`).
   */
  readonly toctouMessage: string;
  /**
   * Domain-specific result handling (warnings, notes). Runs after a successful
   * apply, before the deploy prompt. Injection point for first-run warnings or
   * skipped-entity notices (e.g. view's skipped builtin views).
   */
  readonly onResult?: (result: TResult) => void;
  readonly resolveContainerConfig: (values: TCliValues) => TContainerConfig;
  readonly resolveAppContainerConfig: (
    app: AppEntry,
    projectConfig: ProjectConfig,
    values: TCliValues,
  ) => TContainerConfig;
};

/**
 * Factory for `push` commands (ADR-188-002).
 *
 * Absorbs the boilerplate shared by every config domain: confirm prompt, drift
 * vs. TOCTOU re-wrapping by error code (`ConfigDrift` → snapshot drift surfaced
 * as-is; any other ConflictError → re-wrapped as a TOCTOU message), and per-app
 * deploy via `confirmAndDeploy`. `routeMultiApp` is embedded as in the apply /
 * diff factories. Domain specifics (drift detection, expected-revision, snapshot
 * persistence) live in the `pushFn` usecase; presentation specifics in
 * `onResult`. `--all` is rejected here and handled by the top-level push
 * dispatcher.
 */
export function createPushCommand<
  TContainerConfig,
  TContainer extends { appDeployer: Deployable["appDeployer"] },
  TCliValues extends MultiAppCliValues,
  TResult,
>(
  config: PushCommandConfig<TContainerConfig, TContainer, TCliValues, TResult>,
) {
  const notSupportedAll = new ValidationError(
    ValidationErrorCode.InvalidInput,
    `${config.description} does not support --all yet. Use --app <name> or a single app.`,
  );

  async function runPush(
    containerConfig: TContainerConfig,
    force: boolean,
    skipConfirm: boolean,
  ): Promise<void> {
    if (!skipConfirm) {
      const shouldContinue = await p.confirm({
        message: force
          ? `Force-push local ${config.subject} to kintone (overwrite remote)?`
          : `Push local ${config.subject} to kintone?`,
      });
      if (p.isCancel(shouldContinue) || !shouldContinue) {
        p.cancel("Push cancelled.");
        return;
      }
    }

    const container = config.createContainer(containerConfig);

    const s = p.spinner();
    s.start(`Pushing ${config.subject} to kintone...`);
    let result: TResult;
    try {
      result = await config.pushFn({ container, input: { force } });
    } catch (error) {
      s.stop("Push failed.");
      // Distinguish snapshot drift (tagged ConfigDrift, surfaced as-is) from
      // API optimistic-lock (TOCTOU) conflicts by error code (ADR-188-006). Only
      // the latter is re-wrapped with the TOCTOU message.
      if (
        isConflictError(error) &&
        error.code !== ConflictErrorCode.ConfigDrift
      ) {
        throw new ConflictError(
          ConflictErrorCode.Conflict,
          config.toctouMessage,
          error,
        );
      }
      throw error;
    }
    s.stop(config.spinnerStopMessage);

    config.onResult?.(result);
    p.log.success("Push completed successfully.");

    // confirmAndDeploy is intentionally outside the try above: a 409 during
    // deploy is a separate concurrency event from the push apply, so it surfaces
    // as the adapter's standard ConflictError rather than a push-apply TOCTOU.
    await confirmAndDeploy([container], skipConfirm);
  }

  return define({
    name: "push",
    description: config.description,
    args: {
      ...config.args,
      ...confirmArgs,
      force: {
        type: "boolean" as const,
        description: "Skip drift detection and overwrite remote",
      },
    },
    run: async (ctx) => {
      try {
        const values = ctx.values as TCliValues;
        const force = (ctx.values as { force?: boolean }).force === true;
        const skipConfirm =
          (ctx.values as WithConfirm<TCliValues>).yes === true;

        if (values.all === true) {
          throw notSupportedAll;
        }

        await routeMultiApp(values, {
          singleLegacy: async () => {
            await runPush(
              config.resolveContainerConfig(values),
              force,
              skipConfirm,
            );
          },
          singleApp: async (app, projectConfig) => {
            await runPush(
              config.resolveAppContainerConfig(app, projectConfig, values),
              force,
              skipConfirm,
            );
          },
          multiApp: async () => {
            throw notSupportedAll;
          },
        });
      } catch (error) {
        handleCliError(error);
      }
    },
  });
}
