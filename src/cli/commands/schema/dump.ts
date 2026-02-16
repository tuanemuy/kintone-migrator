import { writeFile } from "node:fs/promises";
import * as p from "@clack/prompts";
import { KintoneRestAPIClient } from "@kintone/rest-api-client";
import { define } from "gunshi";
import pc from "picocolors";
import {
  buildKintoneAuth,
  kintoneArgs,
  multiAppArgs,
  resolveConfig,
} from "../../config";
import { handleCliError } from "../../handleError";
import { printAppHeader } from "../../output";
import {
  resolveAppCliConfig,
  routeMultiApp,
  runMultiAppWithFailCheck,
} from "../../projectConfig";

async function runSingleDump(
  baseUrl: string,
  auth: ReturnType<typeof buildKintoneAuth>,
  appId: string,
  guestSpaceId?: string,
  appName?: string,
): Promise<void> {
  const client = new KintoneRestAPIClient({
    baseUrl,
    auth,
    guestSpaceId,
  });

  const s = p.spinner();
  s.start("Fetching form fields and layout...");

  const [fields, layout] = await Promise.all([
    client.app.getFormFields({ app: appId }),
    client.app.getFormLayout({ app: appId }),
  ]);

  s.stop("Form data fetched.");

  const prefix = appName ? `${appName}-` : "";

  await Promise.all([
    writeFile(`${prefix}fields.json`, JSON.stringify(fields, null, 2)),
    writeFile(`${prefix}layout.json`, JSON.stringify(layout, null, 2)),
  ]);

  p.log.success(
    `Saved ${pc.cyan(`${prefix}fields.json`)} and ${pc.cyan(`${prefix}layout.json`)}`,
  );
}

export default define({
  name: "dump",
  description: "Dump current kintone form fields and layout as JSON",
  args: { ...kintoneArgs, ...multiAppArgs },
  run: async (ctx) => {
    try {
      await routeMultiApp(ctx.values, {
        singleLegacy: async () => {
          const config = resolveConfig(ctx.values);
          await runSingleDump(
            config.baseUrl,
            buildKintoneAuth(config.auth),
            config.appId,
            config.guestSpaceId,
          );
        },
        singleApp: async (app, projectConfig) => {
          const config = resolveAppCliConfig(app, projectConfig, ctx.values);
          await runSingleDump(
            config.baseUrl,
            buildKintoneAuth(config.auth),
            config.appId,
            config.guestSpaceId,
            app.name,
          );
        },
        multiApp: async (plan, projectConfig) => {
          await runMultiAppWithFailCheck(
            plan,
            async (app) => {
              const config = resolveAppCliConfig(
                app,
                projectConfig,
                ctx.values,
              );
              printAppHeader(app.name, app.appId);
              await runSingleDump(
                config.baseUrl,
                buildKintoneAuth(config.auth),
                config.appId,
                config.guestSpaceId,
                app.name,
              );
            },
            "All dumps completed successfully.",
          );
        },
      });
    } catch (error) {
      handleCliError(error);
    }
  },
});
