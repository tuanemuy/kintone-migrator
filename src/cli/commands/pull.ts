import { basename, dirname, extname, join, resolve } from "node:path";
import * as p from "@clack/prompts";
import { define } from "gunshi";
import type { ApplyAllContainers } from "@/core/application/container/applyAll";
import { createCliApplyAllContainers } from "@/core/application/container/applyAllCli";
import {
  SystemError,
  SystemErrorCode,
  ValidationError,
  ValidationErrorCode,
} from "@/core/application/error";
import type { AppExecutionOutcome } from "@/core/application/projectConfig/executeMultiApp";
import { pullAllForApp } from "@/core/application/pullAll/pullAllForApp";
import type { AppName } from "@/core/domain/projectConfig/valueObject";
import { kintoneArgs, multiAppArgs } from "../config";
import { handleCliError } from "../handleError";
import { printAppHeader } from "../output";
import {
  type MultiAppCliValues,
  resolveAppCliConfig,
  routeMultiApp,
  runMultiAppWithFailCheck,
} from "../projectConfig";
import { printPullAllResults, pullAllHasFailure } from "../pullAllOutput";

const pullArgs = {
  domain: kintoneArgs.domain,
  username: kintoneArgs.username,
  password: kintoneArgs.password,
  "api-token": kintoneArgs["api-token"],
  "guest-space-id": kintoneArgs["guest-space-id"],
  ...multiAppArgs,
  ours: {
    type: "boolean" as const,
    description:
      "Auto-resolve every conflict in favor of local (otherwise skip)",
  },
  theirs: {
    type: "boolean" as const,
    description:
      "Auto-resolve every conflict in favor of remote (otherwise skip)",
  },
};

type PullCliValues = MultiAppCliValues & { ours?: boolean; theirs?: boolean };

type CliConfig = {
  baseUrl: string;
  auth:
    | { type: "apiToken"; apiToken: string | string[] }
    | { type: "password"; username: string; password: string };
  appId: string;
  guestSpaceId?: string;
};

/**
 * Derives the customization paths (mirrors customize/capture.ts) for one app's
 * `paths.customize`. `buildAppFilePaths` always names it `<dir>/customize.yaml`,
 * so the file prefix is empty here and basePath = the app directory.
 */
function deriveCustomizePaths(customizeFilePath: string): {
  basePath: string;
  captureBasePath: string;
  filePrefix: string;
} {
  const resolved = resolve(customizeFilePath);
  const captureBasePath = dirname(resolved);
  const fileName = basename(resolved, extname(resolved));
  const filePrefix = fileName === "customize" ? "" : fileName;
  const basePath = join(captureBasePath, filePrefix);
  return { basePath, captureBasePath, filePrefix };
}

async function runPullAll(
  cliConfig: CliConfig,
  appName: string,
  options: { ours: boolean; theirs: boolean },
): Promise<AppExecutionOutcome> {
  const { containers, paths } = createCliApplyAllContainers({
    ...cliConfig,
    appName: appName as AppName,
  });
  const customize = deriveCustomizePaths(paths.customize);

  const s = p.spinner();
  s.start(`Pulling all domains for ${appName}...`);
  const output = await pullAllForApp({
    containers: containers as ApplyAllContainers,
    customizeBasePath: customize.basePath,
    customizeCaptureBasePath: customize.captureBasePath,
    customizeFilePrefix: customize.filePrefix,
    ours: options.ours,
    theirs: options.theirs,
  });
  s.stop("Pull complete.");

  printPullAllResults(output);

  if (pullAllHasFailure(output)) {
    return {
      ok: false,
      error: new SystemError(
        SystemErrorCode.ExecutionError,
        `Pull failed for ${appName}.`,
      ),
    };
  }
  return { ok: true };
}

export default define({
  name: "pull",
  description:
    "Pull all domain configurations (schema, customize, views, etc.) from kintone with 3-way merge",
  args: pullArgs,
  run: async (ctx) => {
    try {
      const values = ctx.values as PullCliValues;
      const ours = values.ours === true;
      const theirs = values.theirs === true;

      if (ours && theirs) {
        throw new ValidationError(
          ValidationErrorCode.InvalidInput,
          "--ours and --theirs cannot be used together",
        );
      }

      await routeMultiApp(values, {
        singleLegacy: async () => {
          p.log.error(
            "The 'pull' command requires a project config file.\nRun 'kintone-migrator init' to create one, or use individual pull commands (e.g. 'schema pull').",
          );
          process.exitCode = 1;
        },
        singleApp: async (app, projectConfig) => {
          const cliConfig = resolveAppCliConfig(app, projectConfig, values);
          const outcome = await runPullAll(cliConfig, app.name, {
            ours,
            theirs,
          });
          if (!outcome.ok) {
            process.exitCode = 1;
          }
        },
        multiApp: async (plan, projectConfig) => {
          await runMultiAppWithFailCheck(plan, async (app) => {
            const cliConfig = resolveAppCliConfig(app, projectConfig, values);
            printAppHeader(app.name, app.appId);
            return runPullAll(cliConfig, app.name, { ours, theirs });
          });
        },
      });
    } catch (error) {
      handleCliError(error);
    }
  },
});
