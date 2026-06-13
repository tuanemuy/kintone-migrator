import { dirname, resolve } from "node:path";
import * as p from "@clack/prompts";
import { define } from "gunshi";
import { applyAllForApp } from "@/core/application/applyAll/applyAllForApp";
import { createCliApplyAllContainers } from "@/core/application/container/applyAllCli";
import { diffAllForApp } from "@/core/application/diffAll/diffAllForApp";
import { SystemError, SystemErrorCode } from "@/core/application/error";
import type { AppExecutionOutcome } from "@/core/application/projectConfig/executeMultiApp";
import { printApplyAllResults } from "../applyAllOutput";
import { confirmArgs, kintoneArgs, multiAppArgs } from "../config";
import { printDiffAllResults } from "../diffAllOutput";
import { handleCliError } from "../handleError";
import { printAppHeader } from "../output";
import {
  type MultiAppCliValues,
  resolveAppCliConfig,
  routeMultiApp,
  runMultiAppWithFailCheck,
} from "../projectConfig";

const dryRunArgs = {
  "dry-run": {
    type: "boolean" as const,
    description: "Show diff preview only without applying changes",
  },
};

const applyArgs = {
  domain: kintoneArgs.domain,
  username: kintoneArgs.username,
  password: kintoneArgs.password,
  "api-token": kintoneArgs["api-token"],
  "guest-space-id": kintoneArgs["guest-space-id"],
  ...multiAppArgs,
  ...confirmArgs,
  ...dryRunArgs,
};

type ApplyCliValues = MultiAppCliValues & {
  yes?: boolean;
  "dry-run"?: boolean;
};

async function runApplyAll(
  cliConfig: {
    baseUrl: string;
    auth:
      | { type: "apiToken"; apiToken: string | string[] }
      | { type: "password"; username: string; password: string };
    appId: string;
    guestSpaceId?: string;
  },
  appName: string,
  options: { skipConfirm: boolean; dryRun: boolean },
): Promise<AppExecutionOutcome> {
  const { containers, diffContainers, paths } = createCliApplyAllContainers({
    ...cliConfig,
    appName:
      appName as import("@/core/domain/projectConfig/valueObject").AppName,
  });

  const customizeBasePath = dirname(resolve(paths.customize));

  // Step 1: Diff preview
  const ds = p.spinner();
  ds.start(`Comparing all domains for ${appName}...`);
  const diffResults = await diffAllForApp({
    containers: diffContainers,
    customizeBasePath,
  });
  const diffFailCount = diffResults.filter((r) => !r.success).length;
  ds.stop(
    `Comparison complete.${diffFailCount > 0 ? ` (${diffFailCount} failed)` : ""}`,
  );

  printDiffAllResults(diffResults);

  // Note about seed data (not included in diff preview)
  const seedExists = (await containers.seed.seedStorage.get()).exists;
  if (seedExists) {
    p.log.info("Note: Seed data will be upserted (no diff preview available).");
  }

  // Check if there are any changes
  const hasChanges = diffResults.some((r) => r.success && !r.result.isEmpty);
  if (!hasChanges) {
    p.log.success(
      seedExists
        ? "No changes detected. Seed data will still be upserted."
        : "No changes detected.",
    );
  }

  // Step 2: Dry run exits here
  if (options.dryRun) {
    p.log.info("Dry run complete. No changes will be applied.");
    if (!hasChanges && seedExists) {
      p.log.info(
        "Note: Seed data would still be upserted when running without --dry-run.",
      );
    }
    return { ok: true };
  }

  // Step 3: Confirm
  if (!options.skipConfirm) {
    const shouldContinue = await p.confirm({
      message: "Apply these changes?",
    });

    if (p.isCancel(shouldContinue) || !shouldContinue) {
      p.cancel("Apply cancelled.");
      return { ok: true };
    }
  }

  // Step 4: Apply all domains
  const as = p.spinner();
  as.start(`Applying all domains for ${appName}...`);
  const output = await applyAllForApp({
    containers,
    customizeBasePath,
  });
  const applyFailCount = output.phases
    .flatMap((pr) => pr.results)
    .filter((r) => !r.success && r.skipped !== "not-found").length;
  as.stop(
    `Apply complete.${applyFailCount > 0 ? ` (${applyFailCount} failed)` : ""}`,
  );

  // Step 5: Print results
  printApplyAllResults(output);

  // Compute the failure truth value for this app and return it as the outcome.
  // The caller (single-app handler or multi-app executor) decides how to turn
  // this into an exit code; runApplyAll never writes process.exitCode directly.
  //
  // A failure is any domain that genuinely failed (execution failure or aborted
  // skip) or a required deploy that failed. A "not-found" skip (config file
  // absent) is not a failure. A deploy that was simply not needed (no Phase 2-4
  // successes, so deployError is undefined) is not an error either, so we check
  // output.deployError instead of !output.deployed.
  const hasFailures = output.phases
    .flatMap((pr) => pr.results)
    .some((r) => !r.success && r.skipped !== "not-found");
  if (hasFailures || output.deployError) {
    return {
      ok: false,
      error:
        output.deployError ??
        new SystemError(
          SystemErrorCode.ExecutionError,
          `Apply failed for ${appName}.`,
        ),
    };
  }

  return { ok: true };
}

export default define({
  name: "apply",
  description:
    "Apply all domain configurations (schema, customize, views, etc.) to kintone app with diff preview",
  args: applyArgs,
  run: async (ctx) => {
    try {
      const values = ctx.values as ApplyCliValues;
      const skipConfirm = values.yes === true;
      const dryRun = values["dry-run"] === true;

      await routeMultiApp(values, {
        singleLegacy: async () => {
          p.log.error(
            "The 'apply' command requires a project config file.\nRun 'kintone-migrator init' to create one, or use individual apply commands (e.g. 'schema migrate').",
          );
          process.exitCode = 1;
        },
        singleApp: async (app, projectConfig) => {
          const cliConfig = resolveAppCliConfig(app, projectConfig, values);
          const outcome = await runApplyAll(cliConfig, app.name, {
            skipConfirm,
            dryRun,
          });
          if (!outcome.ok) {
            process.exitCode = 1;
          }
        },
        multiApp: async (plan, projectConfig) => {
          await runMultiAppWithFailCheck(plan, async (app) => {
            const cliConfig = resolveAppCliConfig(app, projectConfig, values);
            printAppHeader(app.name, app.appId);
            return runApplyAll(cliConfig, app.name, { skipConfirm, dryRun });
          });
        },
      });
    } catch (error) {
      handleCliError(error);
    }
  },
});
