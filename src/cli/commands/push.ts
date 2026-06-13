import { dirname, resolve } from "node:path";
import * as p from "@clack/prompts";
import { define } from "gunshi";
import type { ApplyAllContainers } from "@/core/application/container/applyAll";
import { createCliApplyAllContainers } from "@/core/application/container/applyAllCli";
import { SystemError, SystemErrorCode } from "@/core/application/error";
import type { AppExecutionOutcome } from "@/core/application/projectConfig/executeMultiApp";
import { pushAllForApp } from "@/core/application/pushAll/pushAllForApp";
import type { AppName } from "@/core/domain/projectConfig/valueObject";
import { confirmArgs, kintoneArgs, multiAppArgs } from "../config";
import { handleCliError } from "../handleError";
import { printAppHeader } from "../output";
import {
  type MultiAppCliValues,
  resolveAppCliConfig,
  routeMultiApp,
  runMultiAppWithFailCheck,
} from "../projectConfig";
import { printPushAllResults, pushAllHasFailure } from "../pushAllOutput";

const pushArgs = {
  domain: kintoneArgs.domain,
  username: kintoneArgs.username,
  password: kintoneArgs.password,
  "api-token": kintoneArgs["api-token"],
  "guest-space-id": kintoneArgs["guest-space-id"],
  ...multiAppArgs,
  ...confirmArgs,
  force: {
    type: "boolean" as const,
    description: "Skip drift detection and overwrite remote for every domain",
  },
};

type PushCliValues = MultiAppCliValues & { yes?: boolean; force?: boolean };

type CliConfig = {
  baseUrl: string;
  auth:
    | { type: "apiToken"; apiToken: string | string[] }
    | { type: "password"; username: string; password: string };
  appId: string;
  guestSpaceId?: string;
};

/**
 * Pushes all domains for one app in dependency-ordered phases, then deploys.
 * Deploy stays inside `pushAllForApp`, preserving per-app dependency-ordered
 * deploy even when called per app from the multi-app flow (AC-14).
 */
async function runPushAll(
  cliConfig: CliConfig,
  appName: string,
  force: boolean,
): Promise<AppExecutionOutcome> {
  const { containers, paths } = createCliApplyAllContainers({
    ...cliConfig,
    appName: appName as AppName,
  });
  const customizeBasePath = dirname(resolve(paths.customize));

  const s = p.spinner();
  s.start(`Pushing all domains for ${appName}...`);
  const output = await pushAllForApp({
    containers: containers as ApplyAllContainers,
    customizeBasePath,
    force,
  });
  s.stop("Push complete.");

  printPushAllResults(output);

  if (pushAllHasFailure(output)) {
    return {
      ok: false,
      error:
        output.deployError ??
        new SystemError(
          SystemErrorCode.ExecutionError,
          `Push failed for ${appName}.`,
        ),
    };
  }
  return { ok: true };
}

export default define({
  name: "push",
  description:
    "Push all domain configurations (schema, customize, views, etc.) to kintone with drift detection",
  args: pushArgs,
  run: async (ctx) => {
    try {
      const values = ctx.values as PushCliValues;
      const skipConfirm = values.yes === true;
      const force = values.force === true;

      await routeMultiApp(values, {
        singleLegacy: async () => {
          p.log.error(
            "The 'push' command requires a project config file.\nRun 'kintone-migrator init' to create one, or use individual push commands (e.g. 'schema push').",
          );
          process.exitCode = 1;
        },
        singleApp: async (app, projectConfig) => {
          const cliConfig = resolveAppCliConfig(app, projectConfig, values);
          if (!skipConfirm) {
            const ok = await p.confirm({
              message: force
                ? "Force-push all local config to kintone (overwrite remote)?"
                : "Push all local config to kintone?",
            });
            if (p.isCancel(ok) || !ok) {
              p.cancel("Push cancelled.");
              return;
            }
          }
          const outcome = await runPushAll(cliConfig, app.name, force);
          if (!outcome.ok) {
            process.exitCode = 1;
          }
        },
        multiApp: async (plan, projectConfig) => {
          if (!skipConfirm) {
            const ok = await p.confirm({
              message: force
                ? "Force-push all local config to all apps (overwrite remote)?"
                : "Push all local config to all apps?",
            });
            if (p.isCancel(ok) || !ok) {
              p.cancel("Push cancelled.");
              return;
            }
          }
          // Push in dependency order. Deploy stays inside pushAllForApp, so use
          // runMultiAppWithFailCheck (per-app deploy) rather than an outer
          // confirmAndDeploy — mirrors apply.ts (AC-14).
          await runMultiAppWithFailCheck(plan, async (app) => {
            const cliConfig = resolveAppCliConfig(app, projectConfig, values);
            printAppHeader(app.name, app.appId);
            return runPushAll(cliConfig, app.name, force);
          });
        },
      });
    } catch (error) {
      handleCliError(error);
    }
  },
});
