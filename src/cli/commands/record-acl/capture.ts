import * as p from "@clack/prompts";
import { define } from "gunshi";
import pc from "picocolors";
import type { RecordPermissionCliContainerConfig } from "@/core/application/container/recordPermissionCli";
import { createRecordPermissionCliContainer } from "@/core/application/container/recordPermissionCli";
import { captureRecordPermission } from "@/core/application/recordPermission/captureRecordPermission";
import { saveRecordPermission } from "@/core/application/recordPermission/saveRecordPermission";
import { handleCliError } from "../../handleError";
import { printAppHeader } from "../../output";
import { routeMultiApp, runMultiAppWithFailCheck } from "../../projectConfig";
import {
  type RecordAclCliValues,
  recordAclArgs,
  resolveRecordAclAppContainerConfig,
  resolveRecordAclContainerConfig,
} from "../../recordAclConfig";

async function runCaptureRecordAcl(
  config: RecordPermissionCliContainerConfig,
): Promise<void> {
  const container = createRecordPermissionCliContainer(config);

  const s = p.spinner();
  s.start("Capturing record access permissions...");
  const result = await captureRecordPermission({ container });
  s.stop("Record access permissions captured.");

  await saveRecordPermission({
    container,
    input: { configText: result.configText },
  });

  p.log.success(`Record ACL saved to: ${pc.cyan(config.recordAclFilePath)}`);

  if (result.hasExistingConfig) {
    p.log.warn("Existing record ACL file was overwritten.");
  }
}

export default define({
  name: "capture",
  description:
    "Capture current record access permissions from kintone app to file",
  args: recordAclArgs,
  run: async (ctx) => {
    try {
      const values = ctx.values as RecordAclCliValues;

      await routeMultiApp(values, {
        singleLegacy: async () => {
          const config = resolveRecordAclContainerConfig(values);
          await runCaptureRecordAcl(config);
        },
        singleApp: async (app, projectConfig) => {
          const config = resolveRecordAclAppContainerConfig(
            app,
            projectConfig,
            values,
          );
          await runCaptureRecordAcl(config);
        },
        multiApp: async (plan, projectConfig) => {
          await runMultiAppWithFailCheck(
            plan,
            async (app) => {
              const config = resolveRecordAclAppContainerConfig(
                app,
                projectConfig,
                values,
              );
              printAppHeader(app.name, app.appId);
              await runCaptureRecordAcl(config);
            },
            "All record ACL captures completed successfully.",
          );
        },
      });
    } catch (error) {
      handleCliError(error);
    }
  },
});
