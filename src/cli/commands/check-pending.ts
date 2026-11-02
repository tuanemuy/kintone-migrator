import * as p from "@clack/prompts";
import { define } from "gunshi";
import pc from "picocolors";
import { checkDeployState } from "@/core/application/appRevision/checkDeployState";
import {
  createDeployStateCliContainer,
  type DeployStateCliContainerConfig,
} from "@/core/application/container/deployStateCli";
import { DeployStateEvaluator } from "@/core/domain/appRevision/services/deployStateEvaluator";
import type { DeployState } from "@/core/domain/appRevision/valueObject";
import type { AppName } from "@/core/domain/projectConfig/valueObject";
import { kintoneArgs, multiAppArgs, resolveConfig } from "../config";
import { handleCliError } from "../handleError";
import { printAppsWithUndeployedChanges, printDeployState } from "../output";
import {
  printAvailableApps,
  resolveAppCliConfig,
  routeMultiApp,
  runMultiAppWithHeaders,
} from "../projectConfig";

const checkPendingArgs = {
  domain: kintoneArgs.domain,
  username: kintoneArgs.username,
  password: kintoneArgs.password,
  "api-token": kintoneArgs["api-token"],
  "app-id": kintoneArgs["app-id"],
  "guest-space-id": kintoneArgs["guest-space-id"],
  ...multiAppArgs,
};

async function runCheck(
  config: DeployStateCliContainerConfig,
): Promise<DeployState> {
  const container = createDeployStateCliContainer(config);

  const s = p.spinner();
  s.start("Checking for undeployed changes...");
  let state: DeployState;
  try {
    state = await checkDeployState({ container });
  } catch (error) {
    s.stop("Check failed.");
    throw error;
  }
  s.stop("Check complete.");

  printDeployState(state);
  return state;
}

async function runSingleCheck(
  config: DeployStateCliContainerConfig,
): Promise<void> {
  const state = await runCheck(config);
  if (DeployStateEvaluator.hasUndeployedChanges(state)) {
    process.exitCode = 1;
  }
}

export default define({
  name: "check-pending",
  description:
    "Check whether the kintone app has undeployed changes that a deploy would publish",
  args: checkPendingArgs,
  run: async (ctx) => {
    try {
      const values = ctx.values;

      await routeMultiApp(values, {
        singleLegacy: async () => {
          await runSingleCheck(resolveConfig(values));
        },
        singleApp: async (app, projectConfig) => {
          await runSingleCheck(resolveAppCliConfig(app, projectConfig, values));
        },
        multiApp: async (plan, projectConfig) => {
          const appsWithUndeployedChanges: AppName[] = [];
          try {
            await runMultiAppWithHeaders(plan, async (app) => {
              const state = await runCheck(
                resolveAppCliConfig(app, projectConfig, values),
              );
              if (DeployStateEvaluator.hasUndeployedChanges(state)) {
                appsWithUndeployedChanges.push(app.name);
              }
            });
          } catch (error) {
            // Apps after the failure were skipped, so an empty list here does
            // not mean every app is clean.
            printAppsWithUndeployedChanges(appsWithUndeployedChanges);
            throw error;
          }

          if (appsWithUndeployedChanges.length > 0) {
            printAppsWithUndeployedChanges(appsWithUndeployedChanges);
            process.exitCode = 1;
            return;
          }
          p.log.success("No undeployed changes in any app.");
        },
        noAppSelected: async (projectConfig) => {
          printAvailableApps(projectConfig);
          p.log.error(
            `No app was checked. Pass ${pc.cyan("--app <name>")} or ${pc.cyan("--all")} to check for undeployed changes.`,
          );
          process.exitCode = 1;
        },
      });
    } catch (error) {
      handleCliError(error);
    }
  },
});
