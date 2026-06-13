import * as p from "@clack/prompts";
import { define } from "gunshi";
import { detectAdminNotesThreeWayDiff } from "@/core/application/adminNotes/detectAdminNotesThreeWayDiff";
import {
  type AdminNotesCliContainerConfig,
  createAdminNotesCliContainer,
} from "@/core/application/container/adminNotesCli";
import {
  adminNotesArgs,
  resolveAdminNotesAppContainerConfig,
  resolveAdminNotesContainerConfig,
} from "../../adminNotesConfig";
import { handleCliError } from "../../handleError";
import {
  printAdminNotesDiffResult,
  printAppHeader,
  printThreeWayDiffResult,
} from "../../output";
import { routeMultiApp, runMultiAppWithFailCheck } from "../../projectConfig";

async function runDiff(
  containerConfig: AdminNotesCliContainerConfig,
): Promise<void> {
  const container = createAdminNotesCliContainer(containerConfig);

  const s = p.spinner();
  s.start("Comparing admin notes...");
  let result: Awaited<ReturnType<typeof detectAdminNotesThreeWayDiff>>;
  try {
    result = await detectAdminNotesThreeWayDiff({ container });
  } catch (error) {
    s.stop("Comparison failed.");
    throw error;
  }
  s.stop("Comparison complete.");

  printThreeWayDiffResult(result, printAdminNotesDiffResult);
}

export default define({
  name: "diff",
  description:
    "Compare local admin notes config with remote kintone app (3-way)",
  args: adminNotesArgs,
  run: async (ctx) => {
    try {
      await routeMultiApp(ctx.values, {
        singleLegacy: async () => {
          await runDiff(resolveAdminNotesContainerConfig(ctx.values));
        },
        singleApp: async (app, projectConfig) => {
          await runDiff(
            resolveAdminNotesAppContainerConfig(app, projectConfig, ctx.values),
          );
        },
        multiApp: async (plan, projectConfig) => {
          await runMultiAppWithFailCheck(
            plan,
            async (app) => {
              printAppHeader(app.name, app.appId);
              await runDiff(
                resolveAdminNotesAppContainerConfig(
                  app,
                  projectConfig,
                  ctx.values,
                ),
              );
            },
            "All admin notes diffs completed successfully.",
          );
        },
      });
    } catch (error) {
      handleCliError(error);
    }
  },
});
