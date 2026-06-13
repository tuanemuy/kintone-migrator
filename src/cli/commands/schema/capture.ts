import * as p from "@clack/prompts";
import { define } from "gunshi";
import pc from "picocolors";
import { createCliContainer } from "@/core/application/container/cli";
import type { FormSchemaContainer } from "@/core/application/container/formSchema";
import { captureSchema } from "@/core/application/formSchema/captureSchema";
import { saveSchema } from "@/core/application/formSchema/saveSchema";
import { kintoneArgs, multiAppArgs, resolveConfig } from "../../config";
import { printDeprecationWarning } from "../../deprecation";
import { handleCliError } from "../../handleError";
import { printAppHeader } from "../../output";
import {
  resolveAppCliConfig,
  routeMultiApp,
  runMultiAppWithFailCheck,
} from "../../projectConfig";

async function runCapture(
  container: FormSchemaContainer,
  schemaFilePath: string,
): Promise<void> {
  const s = p.spinner();
  s.start("Capturing current form schema...");
  const result = await captureSchema({ container });
  s.stop("Form schema captured.");

  await saveSchema({
    container,
    input: { schemaText: result.schemaText },
  });

  p.log.success(`Schema saved to: ${pc.cyan(schemaFilePath)}`);

  if (result.hasExistingSchema) {
    p.log.warn("Existing schema was overwritten.");
  }
}

export default define({
  name: "capture",
  description: "Capture current kintone form schema to file",
  args: { ...kintoneArgs, ...multiAppArgs },
  run: async (ctx) => {
    try {
      printDeprecationWarning({
        oldCommand: "schema capture",
        replacement: "schema pull",
        note: "`schema pull` does a 3-way merge; use `schema pull --force` for the legacy overwrite behavior. Legacy commands do not update local state; run schema pull/push to keep state in sync.",
      });

      await routeMultiApp(ctx.values, {
        singleLegacy: async () => {
          const config = resolveConfig(ctx.values);
          const container = createCliContainer(config);
          await runCapture(container, config.schemaFilePath);
        },
        singleApp: async (app, projectConfig) => {
          const config = resolveAppCliConfig(app, projectConfig, ctx.values);
          const container = createCliContainer(config);
          await runCapture(container, config.schemaFilePath);
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
              const container = createCliContainer(config);
              printAppHeader(app.name, app.appId);
              await runCapture(container, config.schemaFilePath);
            },
            "All captures completed successfully.",
          );
        },
      });
    } catch (error) {
      handleCliError(error);
    }
  },
});
