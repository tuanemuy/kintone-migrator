import * as p from "@clack/prompts";
import { define } from "gunshi";
import type { Container } from "@/core/application/container";
import { createCliContainer } from "@/core/application/container/cli";
import { deployApp } from "@/core/application/formSchema/deployApp";
import { detectDiff } from "@/core/application/formSchema/detectDiff";
import { executeMigration } from "@/core/application/formSchema/executeMigration";
import type { AppEntry } from "@/core/domain/projectConfig/entity";
import {
  confirmArgs,
  kintoneArgs,
  multiAppArgs,
  resolveConfig,
} from "../config";
import { handleCliError } from "../handleError";
import { printAppHeader, printDiffResult, promptDeploy } from "../output";
import {
  resolveAppCliConfig,
  routeMultiApp,
  runMultiAppWithFailCheck,
} from "../projectConfig";

async function runSingleMigrate(
  container: Container,
  skipConfirm: boolean,
): Promise<void> {
  const s = p.spinner();
  s.start("Detecting changes...");
  const result = await detectDiff({ container });
  s.stop("Changes detected.");

  if (result.isEmpty) {
    p.log.success("No changes detected. Form is up to date.");
    return;
  }

  printDiffResult(result);

  if (!skipConfirm) {
    const shouldContinue = await p.confirm({
      message: "Apply these changes?",
    });

    if (p.isCancel(shouldContinue) || !shouldContinue) {
      p.cancel("Migration cancelled.");
      process.exit(0);
    }
  }

  const ms = p.spinner();
  ms.start("Applying migration...");
  await executeMigration({ container });
  ms.stop("Migration applied.");

  p.log.success("Migration completed successfully.");

  await promptDeploy(container, skipConfirm);
}

export default define({
  name: "migrate",
  description: "Apply schema changes to kintone form",
  args: { ...kintoneArgs, ...multiAppArgs, ...confirmArgs },
  run: async (ctx) => {
    try {
      const skipConfirm = ctx.values.yes === true;

      await routeMultiApp(ctx.values, {
        singleLegacy: async () => {
          const config = resolveConfig(ctx.values);
          const container = createCliContainer(config);
          await runSingleMigrate(container, skipConfirm);
        },
        singleApp: async (app, projectConfig) => {
          const config = resolveAppCliConfig(app, projectConfig, ctx.values);
          const container = createCliContainer(config);
          await runSingleMigrate(container, skipConfirm);
        },
        multiApp: async (plan, projectConfig) => {
          // multi-app mode: show summary of all changes first
          const appContainers: Array<{
            app: AppEntry;
            container: Container;
            hasChanges: boolean;
          }> = [];

          for (const app of plan.orderedApps) {
            const config = resolveAppCliConfig(app, projectConfig, ctx.values);
            const container = createCliContainer(config);

            printAppHeader(app.name, app.appId);

            const s = p.spinner();
            s.start("Detecting changes...");
            const result = await detectDiff({ container });
            s.stop("Changes detected.");

            printDiffResult(result);
            appContainers.push({
              app,
              container,
              hasChanges: !result.isEmpty,
            });
          }

          const hasAnyChanges = appContainers.some((a) => a.hasChanges);
          if (!hasAnyChanges) {
            p.log.success(
              "No changes detected in any app. All forms are up to date.",
            );
            return;
          }

          if (!skipConfirm) {
            const shouldContinue = await p.confirm({
              message: "Apply these changes to all apps?",
            });

            if (p.isCancel(shouldContinue) || !shouldContinue) {
              p.cancel("Migration cancelled.");
              process.exit(0);
            }
          }

          await runMultiAppWithFailCheck(
            plan,
            async (app) => {
              const entry = appContainers.find((a) => a.app.name === app.name);
              if (!entry) return;

              const { container, hasChanges } = entry;

              printAppHeader(app.name, app.appId);

              if (!hasChanges) {
                p.log.info("No changes. Skipping.");
                return;
              }

              const ms = p.spinner();
              ms.start("Applying migration...");
              await executeMigration({ container });
              ms.stop("Migration applied.");

              const ds = p.spinner();
              ds.start("Deploying to production...");
              await deployApp({ container });
              ds.stop("Migration + Deploy completed.");
            },
            "All migrations completed successfully.",
          );
        },
      });
    } catch (error) {
      handleCliError(error);
    }
  },
});
