import { dirname, resolve } from "node:path";
import * as p from "@clack/prompts";
import { define } from "gunshi";
import { applyAllForApp } from "@/core/application/applyAll/applyAllForApp";
import { createCliApplyAllContainers } from "@/core/application/container/applyAllCli";
import { diffAllForApp } from "@/core/application/diffAll/diffAllForApp";
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

/**
 * Determines whether the apply run should set a non-zero exit code.
 *
 * Skipped domains (config file not found, or aborted) are NOT treated as
 * failures. The exit code is non-zero only when:
 *   - a real failure occurred (a non-success, non-skipped task), or
 *   - there was a deployable change (a Phase 2-4 success, mirroring the
 *     `needsDeploy` condition in applyAllForApp) but deploy did not complete.
 *
 * When every domain is skipped (e.g. all config files missing), there is no
 * deployable success, so a `deployed === false` does not flip the exit code.
 */
export function shouldFailApply(
  output: import("@/core/application/applyAll/applyAllForApp").ApplyAllForAppOutput,
): boolean {
  const allResults = output.phases.flatMap((pr) => pr.results);
  const hasRealFailure = allResults.some((r) => !r.success && !r.skipped);

  const hasDeployableSuccess = output.phases.some(
    (pr) =>
      pr.phase !== "Schema" &&
      pr.phase !== "Seed Data" &&
      pr.results.some((r) => r.success),
  );

  return hasRealFailure || (hasDeployableSuccess && !output.deployed);
}

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
): Promise<void> {
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
    return;
  }

  // Step 3: Confirm
  if (!options.skipConfirm) {
    const shouldContinue = await p.confirm({
      message: "Apply these changes?",
    });

    if (p.isCancel(shouldContinue) || !shouldContinue) {
      p.cancel("Apply cancelled.");
      return;
    }
  }

  // Step 4: Apply all domains
  const as = p.spinner();
  as.start(`Applying all domains for ${appName}...`);
  const output = await applyAllForApp({
    containers,
    customizeBasePath,
  });
  // Skipped domains (aborted or not-found) are not counted as failures.
  const applyFailCount = output.phases
    .flatMap((pr) => pr.results)
    .filter((r) => !r.success && !r.skipped).length;
  as.stop(
    `Apply complete.${applyFailCount > 0 ? ` (${applyFailCount} failed)` : ""}`,
  );

  // Step 5: Print results
  printApplyAllResults(output);

  // Set non-zero exit code for CI/CD pipelines.
  if (shouldFailApply(output)) {
    process.exitCode = 1;
  }
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
          await runApplyAll(cliConfig, app.name, { skipConfirm, dryRun });
        },
        multiApp: async (plan, projectConfig) => {
          await runMultiAppWithFailCheck(plan, async (app) => {
            const cliConfig = resolveAppCliConfig(app, projectConfig, values);
            printAppHeader(app.name, app.appId);
            await runApplyAll(cliConfig, app.name, { skipConfirm, dryRun });
          });
        },
      });
    } catch (error) {
      handleCliError(error);
    }
  },
});
