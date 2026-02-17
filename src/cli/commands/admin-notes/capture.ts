import * as p from "@clack/prompts";
import { define } from "gunshi";
import pc from "picocolors";
import { captureAdminNotes } from "@/core/application/adminNotes/captureAdminNotes";
import { saveAdminNotes } from "@/core/application/adminNotes/saveAdminNotes";
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
import { printAppHeader } from "../../output";
import { routeMultiApp, runMultiAppWithFailCheck } from "../../projectConfig";

async function runCaptureAdminNotes(
  config: AdminNotesCliContainerConfig,
): Promise<void> {
  const container = createAdminNotesCliContainer(config);

  const s = p.spinner();
  s.start("Capturing admin notes...");
  const result = await captureAdminNotes({ container });
  s.stop("Admin notes captured.");

  await saveAdminNotes({
    container,
    input: { configText: result.configText },
  });

  p.log.success(`Admin notes saved to: ${pc.cyan(config.adminNotesFilePath)}`);

  if (result.hasExistingConfig) {
    p.log.warn("Existing admin notes file was overwritten.");
  }
}

export default define({
  name: "capture",
  description: "Capture current admin notes from kintone app to file",
  args: adminNotesArgs,
  run: async (ctx) => {
    try {
      const values = ctx.values as AdminNotesCliValues;

      await routeMultiApp(values, {
        singleLegacy: async () => {
          const config = resolveAdminNotesContainerConfig(values);
          await runCaptureAdminNotes(config);
        },
        singleApp: async (app, projectConfig) => {
          const config = resolveAdminNotesAppContainerConfig(
            app,
            projectConfig,
            values,
          );
          await runCaptureAdminNotes(config);
        },
        multiApp: async (plan, projectConfig) => {
          await runMultiAppWithFailCheck(
            plan,
            async (app) => {
              const config = resolveAdminNotesAppContainerConfig(
                app,
                projectConfig,
                values,
              );
              printAppHeader(app.name, app.appId);
              await runCaptureAdminNotes(config);
            },
            "All admin notes captures completed successfully.",
          );
        },
      });
    } catch (error) {
      handleCliError(error);
    }
  },
});
