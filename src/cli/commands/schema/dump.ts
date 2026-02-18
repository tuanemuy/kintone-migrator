import * as p from "@clack/prompts";
import { define } from "gunshi";
import pc from "picocolors";
import {
  createDumpCliContainer,
  type DumpCliContainerConfig,
} from "@/core/application/container/dumpCli";
import { dumpForm } from "@/core/application/formSchema/dumpForm";
import { kintoneArgs, multiAppArgs, resolveConfig } from "../../config";
import { handleCliError } from "../../handleError";
import { printAppHeader } from "../../output";
import {
  resolveAppCliConfig,
  routeMultiApp,
  runMultiAppWithFailCheck,
} from "../../projectConfig";

async function runSingleDump(config: DumpCliContainerConfig): Promise<void> {
  const container = createDumpCliContainer(config);

  const s = p.spinner();
  s.start("Fetching form fields and layout...");
  await dumpForm({ container });
  s.stop("Form data fetched.");

  p.log.success(
    `Saved ${pc.cyan(`${config.filePrefix}fields.json`)} and ${pc.cyan(`${config.filePrefix}layout.json`)}`,
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
          await runSingleDump({
            baseUrl: config.baseUrl,
            auth: config.auth,
            appId: config.appId,
            guestSpaceId: config.guestSpaceId,
            filePrefix: "",
          });
        },
        singleApp: async (app, projectConfig) => {
          const config = resolveAppCliConfig(app, projectConfig, ctx.values);
          await runSingleDump({
            baseUrl: config.baseUrl,
            auth: config.auth,
            appId: config.appId,
            guestSpaceId: config.guestSpaceId,
            filePrefix: `${app.name}-`,
          });
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
              await runSingleDump({
                baseUrl: config.baseUrl,
                auth: config.auth,
                appId: config.appId,
                guestSpaceId: config.guestSpaceId,
                filePrefix: `${app.name}-`,
              });
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
