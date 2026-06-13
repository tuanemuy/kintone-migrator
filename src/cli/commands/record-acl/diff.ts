import * as p from "@clack/prompts";
import { define } from "gunshi";
import {
  createRecordPermissionCliContainer,
  type RecordPermissionCliContainerConfig,
} from "@/core/application/container/recordPermissionCli";
import { detectRecordPermissionThreeWayDiff } from "@/core/application/recordPermission/detectRecordPermissionThreeWayDiff";
import { handleCliError } from "../../handleError";
import {
  printAppHeader,
  printRecordPermissionDiffResult,
  printThreeWayDiffResult,
} from "../../output";
import { routeMultiApp, runMultiAppWithFailCheck } from "../../projectConfig";
import {
  recordAclArgs,
  resolveRecordAclAppContainerConfig,
  resolveRecordAclContainerConfig,
} from "../../recordAclConfig";

async function runDiff(
  containerConfig: RecordPermissionCliContainerConfig,
): Promise<void> {
  const container = createRecordPermissionCliContainer(containerConfig);

  const s = p.spinner();
  s.start("Comparing record permissions...");
  let result: Awaited<ReturnType<typeof detectRecordPermissionThreeWayDiff>>;
  try {
    result = await detectRecordPermissionThreeWayDiff({ container });
  } catch (error) {
    s.stop("Comparison failed.");
    throw error;
  }
  s.stop("Comparison complete.");

  printThreeWayDiffResult(result, printRecordPermissionDiffResult);
}

export default define({
  name: "diff",
  description:
    "Compare local record permission config with remote kintone app (3-way)",
  args: recordAclArgs,
  run: async (ctx) => {
    try {
      await routeMultiApp(ctx.values, {
        singleLegacy: async () => {
          await runDiff(resolveRecordAclContainerConfig(ctx.values));
        },
        singleApp: async (app, projectConfig) => {
          await runDiff(
            resolveRecordAclAppContainerConfig(app, projectConfig, ctx.values),
          );
        },
        multiApp: async (plan, projectConfig) => {
          await runMultiAppWithFailCheck(
            plan,
            async (app) => {
              printAppHeader(app.name, app.appId);
              await runDiff(
                resolveRecordAclAppContainerConfig(
                  app,
                  projectConfig,
                  ctx.values,
                ),
              );
            },
            "All record permission diffs completed successfully.",
          );
        },
      });
    } catch (error) {
      handleCliError(error);
    }
  },
});
