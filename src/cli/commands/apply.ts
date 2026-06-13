import { dirname, resolve } from "node:path";
import * as p from "@clack/prompts";
import { define } from "gunshi";
import { applyAllForApp } from "@/core/application/applyAll/applyAllForApp";
import type { ApplyAllContainers } from "@/core/application/container/applyAll";
import { createCliApplyAllContainers } from "@/core/application/container/applyAllCli";
import { diffAllForApp } from "@/core/application/diffAll/diffAllForApp";
import { SystemError, SystemErrorCode } from "@/core/application/error";
import type { AppExecutionOutcome } from "@/core/application/projectConfig/executeMultiApp";
import type { AppEntry } from "@/core/domain/projectConfig/entity";
import type { AppName } from "@/core/domain/projectConfig/valueObject";
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

type CliConfig = {
  baseUrl: string;
  auth:
    | { type: "apiToken"; apiToken: string | string[] }
    | { type: "password"; username: string; password: string };
  appId: string;
  guestSpaceId?: string;
};

/**
 * Result of the diff phase carried into the apply phase. `containers` and
 * `customizeBasePath` are reused so the apply phase does not regenerate them
 * (the diff/apply containers share the same client). `hasChanges` is diff-based;
 * `seedExists` is tracked separately because seed never appears in the diff
 * preview yet still drives whether apply is required (see ADR-002).
 */
type ApplyDiffPhaseResult = {
  containers: ApplyAllContainers;
  customizeBasePath: string;
  seedExists: boolean;
  hasChanges: boolean;
};

/**
 * Diff phase: generate containers, run the diff preview, print results, emit the
 * seed note, and report whether there are changes. Does not print the dry-run
 * note — the caller decides when to surface it.
 */
async function runApplyDiffPhase(
  cliConfig: CliConfig,
  appName: string,
): Promise<ApplyDiffPhaseResult> {
  const { containers, diffContainers, paths } = createCliApplyAllContainers({
    ...cliConfig,
    appName: appName as AppName,
  });

  const customizeBasePath = dirname(resolve(paths.customize));

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

  const hasChanges = diffResults.some((r) => r.success && !r.result.isEmpty);

  return { containers, customizeBasePath, seedExists, hasChanges };
}

/**
 * Apply phase: run apply for one app, print results, and compute the
 * `AppExecutionOutcome`. Deploy stays embedded in `applyAllForApp`, so this
 * preserves per-app dependency-ordered deploy even when called per app from the
 * multi-app flow.
 */
async function runApplyExecutePhase({
  containers,
  customizeBasePath,
  appName,
}: {
  containers: ApplyAllContainers;
  customizeBasePath: string;
  appName: string;
}): Promise<AppExecutionOutcome> {
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

  printApplyAllResults(output);

  // Return the failure verdict as an outcome; the caller decides how to map it
  // to an exit code. This never writes process.exitCode directly.
  //
  // A failure is any domain that genuinely failed (execution failure or aborted
  // skip) or a required deploy that failed. A "not-found" skip (config file
  // absent) is not a failure. A deploy that was simply not needed leaves
  // deployError undefined, so we check output.deployError rather than
  // !output.deployed.
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

/**
 * Single-app wrapper that runs the diff and apply phases in sequence, preserving
 * the original single-mode flow (diff → dry-run early return → confirm → apply).
 * Multi-app does not use this wrapper; it inserts a single cross-app confirm
 * between the phases instead.
 */
async function runApplyAll(
  cliConfig: CliConfig,
  appName: string,
  options: { skipConfirm: boolean; dryRun: boolean },
): Promise<AppExecutionOutcome> {
  const { containers, customizeBasePath, seedExists, hasChanges } =
    await runApplyDiffPhase(cliConfig, appName);

  if (!hasChanges) {
    p.log.success(
      seedExists
        ? "No changes detected. Seed data will still be upserted."
        : "No changes detected.",
    );
  }

  // Dry run exits here
  if (options.dryRun) {
    p.log.info("Dry run complete. No changes will be applied.");
    if (!hasChanges && seedExists) {
      p.log.info(
        "Note: Seed data would still be upserted when running without --dry-run.",
      );
    }
    return { ok: true };
  }

  // Confirm
  if (!options.skipConfirm) {
    const shouldContinue = await p.confirm({
      message: "Apply these changes?",
    });

    if (p.isCancel(shouldContinue) || !shouldContinue) {
      p.cancel("Apply cancelled.");
      return { ok: true };
    }
  }

  return runApplyExecutePhase({ containers, customizeBasePath, appName });
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
          // Mirrors applyCommandFactory's multiApp+diffPreview pattern: collect
          // every app's diff first, confirm once, then apply in dependency
          // order. Unlike the factory, deploy stays inside applyAllForApp
          // (per-app dependency-ordered deploy is required here), so apply runs
          // via runMultiAppWithFailCheck rather than an outer confirmAndDeploy.
          // See ADR-001.

          // Phase 1: Collect diffs for all apps (in dependency order). The apply
          // container is generated once here and reused in Phase 5.
          const appDiffResults: Array<
            { app: AppEntry } & ApplyDiffPhaseResult
          > = [];
          for (const app of plan.orderedApps) {
            const cliConfig = resolveAppCliConfig(app, projectConfig, values);
            printAppHeader(app.name, app.appId);
            const diff = await runApplyDiffPhase(cliConfig, app.name);
            appDiffResults.push({ app, ...diff });
          }

          // Phase 2: Cross-app change detection. seed counts as "changes" even
          // without a diff entry, so an app with only seed still triggers apply
          // (see ADR-002).
          const hasAnyChanges = appDiffResults.some(
            (a) => a.hasChanges || a.seedExists,
          );
          if (!hasAnyChanges) {
            p.log.success("No changes detected in any app.");
            return;
          }

          // Phase 3: Dry run exits here — diffs are already shown above.
          if (dryRun) {
            p.log.info("Dry run complete. No changes will be applied.");
            if (appDiffResults.some((a) => !a.hasChanges && a.seedExists)) {
              p.log.info(
                "Note: Seed data would still be upserted when running without --dry-run.",
              );
            }
            return;
          }

          // Phase 4: Single confirm for all apps.
          if (!skipConfirm) {
            const shouldContinue = await p.confirm({
              message: "Apply these changes to all apps?",
            });

            if (p.isCancel(shouldContinue) || !shouldContinue) {
              p.cancel("Apply cancelled.");
              return;
            }
          }

          // Phase 5: Apply in dependency order. Headers were already printed in
          // Phase 1, so use runMultiAppWithFailCheck (no headers) to avoid a
          // duplicate header per app. Each executor reuses the Phase 1 container
          // and returns the AppExecutionOutcome verbatim to preserve fail-fast.
          await runMultiAppWithFailCheck(plan, async (app) => {
            const entry = appDiffResults.find((a) => a.app.name === app.name);
            if (!entry) {
              throw new SystemError(
                SystemErrorCode.InternalServerError,
                `App diff result not found for "${app.name}"`,
              );
            }

            // Skip apps with neither diff changes nor seed (ADR-002); returning
            // { ok: true } keeps them from inducing fail-fast.
            if (!entry.hasChanges && !entry.seedExists) {
              p.log.info("No changes. Skipping.");
              return { ok: true };
            }

            return runApplyExecutePhase({
              containers: entry.containers,
              customizeBasePath: entry.customizeBasePath,
              appName: app.name,
            });
          });
        },
      });
    } catch (error) {
      handleCliError(error);
    }
  },
});
