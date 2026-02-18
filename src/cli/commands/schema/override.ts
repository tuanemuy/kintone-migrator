import * as p from "@clack/prompts";
import { define } from "gunshi";
import pc from "picocolors";
import type { Container } from "@/core/application/container";
import { createCliContainer } from "@/core/application/container/cli";
import { ValidationError, ValidationErrorCode } from "@/core/application/error";
import { deployApp } from "@/core/application/formSchema/deployApp";
import { forceOverrideForm } from "@/core/application/formSchema/forceOverrideForm";
import { resetForm } from "@/core/application/formSchema/resetForm";
import {
  confirmArgs,
  kintoneArgs,
  multiAppArgs,
  resolveConfig,
} from "../../config";
import { handleCliError } from "../../handleError";
import { printAppHeader, promptDeploy } from "../../output";
import {
  resolveAppCliConfig,
  routeMultiApp,
  runMultiAppWithFailCheck,
} from "../../projectConfig";

async function runSingleOverride(
  container: Container,
  skipConfirm: boolean,
): Promise<void> {
  p.log.warn(
    `${pc.bold(pc.red("WARNING:"))} This will replace the entire form with the declared schema.`,
  );
  p.log.warn("Fields not defined in the schema will be deleted.");

  if (!skipConfirm) {
    const shouldContinue = await p.confirm({
      message: "Are you sure you want to force override?",
    });

    if (p.isCancel(shouldContinue) || !shouldContinue) {
      p.cancel("Force override cancelled.");
      return;
    }
  }

  const s = p.spinner();
  s.start("Force overriding form...");
  await forceOverrideForm({ container });
  s.stop("Force override applied.");

  p.log.success("Force override completed successfully.");

  await promptDeploy(container, skipConfirm);
}

async function runSingleReset(
  container: Container,
  skipConfirm: boolean,
): Promise<void> {
  p.log.warn(
    `${pc.bold(pc.red("WARNING:"))} This will delete ALL custom fields, resetting the form to empty.`,
  );

  if (!skipConfirm) {
    const shouldContinue = await p.confirm({
      message: "Are you sure you want to reset the form?",
    });

    if (p.isCancel(shouldContinue) || !shouldContinue) {
      p.cancel("Reset cancelled.");
      return;
    }
  }

  const s = p.spinner();
  s.start("Resetting form...");
  await resetForm({ container });
  s.stop("Form reset applied.");

  p.log.success("Reset completed successfully.");

  await promptDeploy(container, skipConfirm);
}

export default define({
  name: "override",
  description: "Force override kintone form with declared schema",
  args: {
    ...kintoneArgs,
    ...multiAppArgs,
    ...confirmArgs,
    reset: {
      type: "boolean" as const,
      description: "Reset form by deleting all custom fields",
    },
  },
  run: async (ctx) => {
    try {
      const isReset = ctx.values.reset === true;
      const skipConfirm = ctx.values.yes === true;

      if (isReset && ctx.values["schema-file"]) {
        throw new ValidationError(
          ValidationErrorCode.InvalidInput,
          "--reset and --schema-file cannot be used together",
        );
      }

      await routeMultiApp(ctx.values, {
        singleLegacy: async () => {
          const config = resolveConfig(ctx.values);
          const container = createCliContainer(config);
          if (isReset) {
            await runSingleReset(container, skipConfirm);
          } else {
            await runSingleOverride(container, skipConfirm);
          }
        },
        singleApp: async (app, projectConfig) => {
          const config = resolveAppCliConfig(app, projectConfig, ctx.values);
          const container = createCliContainer(config);
          if (isReset) {
            await runSingleReset(container, skipConfirm);
          } else {
            await runSingleOverride(container, skipConfirm);
          }
        },
        multiApp: async (plan, projectConfig) => {
          if (isReset) {
            p.log.warn(
              `${pc.bold(pc.red("WARNING:"))} This will delete ALL custom fields from ALL apps, resetting them to empty.`,
            );

            if (!skipConfirm) {
              const shouldContinue = await p.confirm({
                message: "Are you sure you want to reset all apps?",
              });

              if (p.isCancel(shouldContinue) || !shouldContinue) {
                p.cancel("Reset cancelled.");
                return;
              }
            }

            const reversedPlan = {
              orderedApps: [...plan.orderedApps].reverse(),
            };

            await runMultiAppWithFailCheck(
              reversedPlan,
              async (app) => {
                const config = resolveAppCliConfig(
                  app,
                  projectConfig,
                  ctx.values,
                );
                const container = createCliContainer(config);

                printAppHeader(app.name, app.appId);

                const s = p.spinner();
                s.start("Resetting form...");
                await resetForm({ container });
                s.stop("Form reset applied.");

                const ds = p.spinner();
                ds.start("Deploying to production...");
                await deployApp({ container });
                ds.stop("Reset + Deploy completed.");
              },
              "All resets completed successfully.",
            );
          } else {
            p.log.warn(
              `${pc.bold(pc.red("WARNING:"))} This will replace the entire form for ALL apps with their declared schemas.`,
            );
            p.log.warn("Fields not defined in each schema will be deleted.");

            if (!skipConfirm) {
              const shouldContinue = await p.confirm({
                message: "Are you sure you want to force override all apps?",
              });

              if (p.isCancel(shouldContinue) || !shouldContinue) {
                p.cancel("Force override cancelled.");
                return;
              }
            }

            await runMultiAppWithFailCheck(
              plan,
              async (app) => {
                const config = resolveAppCliConfig(
                  app,
                  projectConfig,
                  ctx.values,
                );
                const container = createCliContainer(config);

                printAppHeader(app.name, app.appId);

                const s = p.spinner();
                s.start("Force overriding form...");
                await forceOverrideForm({ container });
                s.stop("Force override applied.");

                const ds = p.spinner();
                ds.start("Deploying to production...");
                await deployApp({ container });
                ds.stop("Override + Deploy completed.");
              },
              "All overrides completed successfully.",
            );
          }
        },
      });
    } catch (error) {
      handleCliError(error);
    }
  },
});
