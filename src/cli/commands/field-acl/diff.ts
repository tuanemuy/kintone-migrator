import * as p from "@clack/prompts";
import { define } from "gunshi";
import {
  createFieldPermissionCliContainer,
  type FieldPermissionCliContainerConfig,
} from "@/core/application/container/fieldPermissionCli";
import { detectFieldPermissionThreeWayDiff } from "@/core/application/fieldPermission/detectFieldPermissionThreeWayDiff";
import {
  fieldAclArgs,
  resolveFieldAclAppContainerConfig,
  resolveFieldAclContainerConfig,
} from "../../fieldAclConfig";
import { handleCliError } from "../../handleError";
import {
  printAppHeader,
  printFieldPermissionDiffResult,
  printThreeWayDiffResult,
} from "../../output";
import { routeMultiApp, runMultiAppWithFailCheck } from "../../projectConfig";

async function runDiff(
  containerConfig: FieldPermissionCliContainerConfig,
): Promise<void> {
  const container = createFieldPermissionCliContainer(containerConfig);

  const s = p.spinner();
  s.start("Comparing field permissions...");
  let result: Awaited<ReturnType<typeof detectFieldPermissionThreeWayDiff>>;
  try {
    result = await detectFieldPermissionThreeWayDiff({ container });
  } catch (error) {
    s.stop("Comparison failed.");
    throw error;
  }
  s.stop("Comparison complete.");

  printThreeWayDiffResult(result, printFieldPermissionDiffResult);
}

export default define({
  name: "diff",
  description:
    "Compare local field permission config with remote kintone app (3-way)",
  args: fieldAclArgs,
  run: async (ctx) => {
    try {
      await routeMultiApp(ctx.values, {
        singleLegacy: async () => {
          await runDiff(resolveFieldAclContainerConfig(ctx.values));
        },
        singleApp: async (app, projectConfig) => {
          await runDiff(
            resolveFieldAclAppContainerConfig(app, projectConfig, ctx.values),
          );
        },
        multiApp: async (plan, projectConfig) => {
          await runMultiAppWithFailCheck(
            plan,
            async (app) => {
              printAppHeader(app.name, app.appId);
              await runDiff(
                resolveFieldAclAppContainerConfig(
                  app,
                  projectConfig,
                  ctx.values,
                ),
              );
            },
            "All field permission diffs completed successfully.",
          );
        },
      });
    } catch (error) {
      handleCliError(error);
    }
  },
});
