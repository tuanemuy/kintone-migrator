import * as p from "@clack/prompts";
import { define } from "gunshi";
import { detectAdminNotesDiff } from "@/core/application/adminNotes/detectAdminNotesDiff";
import {
  type AdminNotesCliContainerConfig,
  createAdminNotesCliContainer,
} from "@/core/application/container/adminNotesCli";
import {
  type AdminNotesCliValues,
  adminNotesArgs,
  resolveAdminNotesAppContainerConfig,
  resolveAdminNotesContainerConfig,
} from "../../adminNotesConfig";
import { handleCliError } from "../../handleError";
import { printAdminNotesDiffResult, printAppHeader } from "../../output";
import { routeMultiApp, runMultiAppWithFailCheck } from "../../projectConfig";

async function runDiff(config: AdminNotesCliContainerConfig): Promise<void> {
  const container = createAdminNotesCliContainer(config);

  const s = p.spinner();
  s.start("Comparing admin notes...");
  const result = await detectAdminNotesDiff({ container });
  s.stop("Comparison complete.");

  printAdminNotesDiffResult(result);
}

export default define({
  name: "diff",
  description: "Compare local admin notes config with remote kintone app",
  args: adminNotesArgs,
  run: async (ctx) => {
    try {
      const values = ctx.values as AdminNotesCliValues;

      await routeMultiApp(values, {
        singleLegacy: async () => {
          const config = resolveAdminNotesContainerConfig(values);
          await runDiff(config);
        },
        singleApp: async (app, projectConfig) => {
          const config = resolveAdminNotesAppContainerConfig(
            app,
            projectConfig,
            values,
          );
          await runDiff(config);
        },
        multiApp: async (plan, projectConfig) => {
          await runMultiAppWithFailCheck(plan, async (app) => {
            const config = resolveAdminNotesAppContainerConfig(
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
