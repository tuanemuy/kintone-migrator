import { dirname, resolve } from "node:path";
import * as p from "@clack/prompts";
import { define } from "gunshi";
import { createCliCaptureContainers } from "@/core/application/container/captureAllCli";
import { captureAllForApp } from "@/core/application/init/captureAllForApp";
import { printCaptureAllResults } from "../captureAllOutput";
import { kintoneArgs, multiAppArgs } from "../config";
import { handleCliError } from "../handleError";
import { printAppHeader } from "../output";
import {
  type MultiAppCliValues,
  resolveAppCliConfig,
  routeMultiApp,
  runMultiAppWithFailCheck,
} from "../projectConfig";

const captureArgs = {
  domain: kintoneArgs.domain,
  username: kintoneArgs.username,
  password: kintoneArgs.password,
  "api-token": kintoneArgs["api-token"],
  "guest-space-id": kintoneArgs["guest-space-id"],
  ...multiAppArgs,
};

type CaptureCliValues = MultiAppCliValues;

async function runCaptureAll(
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
  const { containers, paths } = createCliCaptureContainers({
    ...cliConfig,
    appName:
      appName as import("@/core/domain/projectConfig/valueObject").AppName,
  });

  const customizeBasePath = dirname(resolve(paths.customize));

  const s = p.spinner();
  s.start(`Capturing all domains for ${appName}...`);
  const results = await captureAllForApp({
    container: containers,
    input: { customizeBasePath },
  });
  const failCount = results.filter((r) => !r.success).length;
  s.stop(`Capture complete.${failCount > 0 ? ` (${failCount} failed)` : ""}`);

  printCaptureAllResults(results, paths);
}

export default define({
  name: "capture",
  description:
    "Capture all domain configurations (schema, customize, views, etc.) from kintone app and save to local files",
  args: captureArgs,
  run: async (ctx) => {
    try {
      const values = ctx.values as CaptureCliValues;

      await routeMultiApp(values, {
        singleLegacy: async () => {
          p.log.error(
            "The 'capture' command requires a project config file.\nRun 'kintone-migrator init' to create one, or use individual capture commands (e.g. 'schema capture').",
          );
          process.exitCode = 1;
        },
        singleApp: async (app, projectConfig) => {
          const cliConfig = resolveAppCliConfig(app, projectConfig, values);
          await runCaptureAll(cliConfig, app.name);
        },
        multiApp: async (plan, projectConfig) => {
          await runMultiAppWithFailCheck(plan, async (app) => {
            const cliConfig = resolveAppCliConfig(app, projectConfig, values);
            printAppHeader(app.name, app.appId);
            await runCaptureAll(cliConfig, app.name);
          });
        },
      });
    } catch (error) {
      handleCliError(error);
    }
  },
});
