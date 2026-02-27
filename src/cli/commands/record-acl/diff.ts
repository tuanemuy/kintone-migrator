import * as p from "@clack/prompts";
import { define } from "gunshi";
import {
  createRecordPermissionCliContainer,
  type RecordPermissionCliContainerConfig,
} from "@/core/application/container/recordPermissionCli";
import { detectRecordPermissionDiff } from "@/core/application/recordPermission/detectRecordPermissionDiff";
import { handleCliError } from "../../handleError";
import { printAppHeader, printRecordPermissionDiffResult } from "../../output";
import { routeMultiApp, runMultiAppWithFailCheck } from "../../projectConfig";
import {
  type RecordAclCliValues,
  recordAclArgs,
  resolveRecordAclAppContainerConfig,
  resolveRecordAclContainerConfig,
} from "../../recordAclConfig";

async function runDiff(
  config: RecordPermissionCliContainerConfig,
): Promise<void> {
  const container = createRecordPermissionCliContainer(config);

  const s = p.spinner();
  s.start("Comparing record permissions...");
  const result = await detectRecordPermissionDiff({ container });
  s.stop("Comparison complete.");

  printRecordPermissionDiffResult(result);
}

export default define({
  name: "diff",
  description: "Compare local record permission config with remote kintone app",
  args: recordAclArgs,
  run: async (ctx) => {
    try {
      const values = ctx.values as RecordAclCliValues;

      await routeMultiApp(values, {
        singleLegacy: async () => {
          const config = resolveRecordAclContainerConfig(values);
          await runDiff(config);
        },
        singleApp: async (app, projectConfig) => {
          const config = resolveRecordAclAppContainerConfig(
            app,
            projectConfig,
            values,
          );
          await runDiff(config);
        },
        multiApp: async (plan, projectConfig) => {
          await runMultiAppWithFailCheck(plan, async (app) => {
            const config = resolveRecordAclAppContainerConfig(
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
