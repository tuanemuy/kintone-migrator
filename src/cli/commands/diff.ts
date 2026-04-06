import { dirname, resolve } from "node:path";
import * as p from "@clack/prompts";
import { define } from "gunshi";
import { createCliDiffAllContainers } from "@/core/application/container/diffAllCli";
import { diffAllForApp } from "@/core/application/diffAll/diffAllForApp";
import { kintoneArgs, multiAppArgs } from "../config";
import { printDiffAllResults } from "../diffAllOutput";
import { handleCliError } from "../handleError";
import { printAppHeader } from "../output";
import {
  type MultiAppCliValues,
  resolveAppCliConfig,
  routeMultiApp,
  runMultiAppWithFailCheck,
} from "../projectConfig";

const diffArgs = {
  domain: kintoneArgs.domain,
  username: kintoneArgs.username,
  password: kintoneArgs.password,
  "api-token": kintoneArgs["api-token"],
  "guest-space-id": kintoneArgs["guest-space-id"],
  ...multiAppArgs,
};

type DiffCliValues = MultiAppCliValues;

async function runDiffAll(
  cliConfig: {
    baseUrl: string;
    auth:
      | { type: "apiToken"; apiToken: string | string[] }
      | { type: "password"; username: string; password: string };
    appId: string;
    guestSpaceId?: string;
  },
  appName: string,
): Promise<void> {
  const { containers, paths } = createCliDiffAllContainers({
    ...cliConfig,
    appName:
      appName as import("@/core/domain/projectConfig/valueObject").AppName,
  });

  const customizeBasePath = dirname(resolve(paths.customize));

  const s = p.spinner();
  s.start(`Comparing all domains for ${appName}...`);
  const results = await diffAllForApp({
    containers,
    customizeBasePath,
  });
  const failCount = results.filter((r) => !r.success).length;
  s.stop(
    `Comparison complete.${failCount > 0 ? ` (${failCount} failed)` : ""}`,
  );

  printDiffAllResults(results);
}

export default define({
  name: "diff",
  description:
    "Compare all domain configurations (schema, customize, views, etc.) between local files and kintone app",
  args: diffArgs,
  run: async (ctx) => {
    try {
      const values = ctx.values as DiffCliValues;

      await routeMultiApp(values, {
        singleLegacy: async () => {
          p.log.error(
            "The 'diff' command requires a project config file.\nRun 'kintone-migrator init' to create one, or use individual diff commands (e.g. 'schema diff').",
          );
          process.exitCode = 1;
        },
        singleApp: async (app, projectConfig) => {
          const cliConfig = resolveAppCliConfig(app, projectConfig, values);
          await runDiffAll(cliConfig, app.name);
        },
        multiApp: async (plan, projectConfig) => {
          await runMultiAppWithFailCheck(plan, async (app) => {
            const cliConfig = resolveAppCliConfig(app, projectConfig, values);
            printAppHeader(app.name, app.appId);
            await runDiffAll(cliConfig, app.name);
          });
        },
      });
    } catch (error) {
      handleCliError(error);
    }
  },
});
