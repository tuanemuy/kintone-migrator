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
  p.log.info("Note: Seed data will be upserted (no diff preview available).");

  // Check if there are any changes
  const hasChanges = diffResults.some((r) => r.success && !r.result.isEmpty);
  if (!hasChanges) {
    p.log.success("No changes detected. Seed data will still be upserted.");
  }

  // Step 2: Dry run exits here
  if (options.dryRun) {
    p.log.info("Dry run complete. No changes will be applied.");
    if (!hasChanges) {
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
  const applyFailCount = output.phases
    .flatMap((pr) => pr.results)
    .filter((r) => !r.success).length;
  as.stop(
    `Apply complete.${applyFailCount > 0 ? ` (${applyFailCount} failed)` : ""}`,
  );

  // Step 5: Print results
  printApplyAllResults(output);
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
