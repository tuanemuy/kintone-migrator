import * as p from "@clack/prompts";
import { define } from "gunshi";
import { createCliContainer } from "@/core/application/container/cli";
import type { FormSchemaContainer } from "@/core/application/container/formSchema";
import { detectDiff } from "@/core/application/formSchema/detectDiff";
import { kintoneArgs, multiAppArgs, resolveConfig } from "../../config";
import { handleCliError } from "../../handleError";
import { printAppHeader, printDiffResult } from "../../output";
import {
  resolveAppCliConfig,
  routeMultiApp,
  runMultiAppWithFailCheck,
} from "../../projectConfig";

async function runDiff(container: FormSchemaContainer): Promise<void> {
  const s = p.spinner();
  s.start("Fetching form schema...");
  const result = await detectDiff({ container });
  s.stop("Form schema fetched.");

  printDiffResult(result);
}

export default define({
  name: "diff",
  description:
    "Detect differences between schema file and current kintone form",
  args: { ...kintoneArgs, ...multiAppArgs },
  run: async (ctx) => {
    try {
      await routeMultiApp(ctx.values, {
        singleLegacy: async () => {
          const config = resolveConfig(ctx.values);
          const container = createCliContainer(config);
          await runDiff(container);
        },
        singleApp: async (app, projectConfig) => {
          const config = resolveAppCliConfig(app, projectConfig, ctx.values);
          const container = createCliContainer(config);
          await runDiff(container);
        },
        multiApp: async (plan, projectConfig) => {
          await runMultiAppWithFailCheck(plan, async (app) => {
            const config = resolveAppCliConfig(app, projectConfig, ctx.values);
            const container = createCliContainer(config);
            printAppHeader(app.name, app.appId);
            await runDiff(container);
          });
        },
      });
    } catch (error) {
      handleCliError(error);
    }
  },
});
