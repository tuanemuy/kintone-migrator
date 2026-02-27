import * as p from "@clack/prompts";
import { define } from "gunshi";
import {
  createFieldPermissionCliContainer,
  type FieldPermissionCliContainerConfig,
} from "@/core/application/container/fieldPermissionCli";
import { detectFieldPermissionDiff } from "@/core/application/fieldPermission/detectFieldPermissionDiff";
import {
  type FieldAclCliValues,
  fieldAclArgs,
  resolveFieldAclAppContainerConfig,
  resolveFieldAclContainerConfig,
} from "../../fieldAclConfig";
import { handleCliError } from "../../handleError";
import { printAppHeader, printFieldPermissionDiffResult } from "../../output";
import { routeMultiApp, runMultiAppWithFailCheck } from "../../projectConfig";

async function runDiff(
  config: FieldPermissionCliContainerConfig,
): Promise<void> {
  const container = createFieldPermissionCliContainer(config);

  const s = p.spinner();
  s.start("Comparing field permissions...");
  const result = await detectFieldPermissionDiff({ container });
  s.stop("Comparison complete.");

  printFieldPermissionDiffResult(result);
}

export default define({
  name: "diff",
  description: "Compare local field permission config with remote kintone app",
  args: fieldAclArgs,
  run: async (ctx) => {
    try {
      const values = ctx.values as FieldAclCliValues;

      await routeMultiApp(values, {
        singleLegacy: async () => {
          const config = resolveFieldAclContainerConfig(values);
          await runDiff(config);
        },
        singleApp: async (app, projectConfig) => {
          const config = resolveFieldAclAppContainerConfig(
            app,
            projectConfig,
            values,
          );
          await runDiff(config);
        },
        multiApp: async (plan, projectConfig) => {
          await runMultiAppWithFailCheck(plan, async (app) => {
            const config = resolveFieldAclAppContainerConfig(
              app,
              projectConfig,
              values,
            );
            printAppHeader(app.name, app.appId);
            await runDiff(config);
          });
        },
      });
    } catch (error) {
      handleCliError(error);
    }
  },
});
