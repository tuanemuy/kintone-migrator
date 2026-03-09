import * as p from "@clack/prompts";
import { define } from "gunshi";
import type { RecordPermissionContainer } from "@/core/application/container/recordPermission";
import type { RecordPermissionCliContainerConfig } from "@/core/application/container/recordPermissionCli";
import { createRecordPermissionCliContainer } from "@/core/application/container/recordPermissionCli";
import { applyRecordPermission } from "@/core/application/recordPermission/applyRecordPermission";
import { confirmArgs, type WithConfirm } from "../../config";
import { handleCliError } from "../../handleError";
import { confirmAndDeploy, type Deployable } from "../../output";
import { routeMultiApp, runMultiAppWithHeaders } from "../../projectConfig";
import {
  type RecordAclCliValues,
  recordAclArgs,
  resolveRecordAclAppContainerConfig,
  resolveRecordAclContainerConfig,
} from "../../recordAclConfig";

async function runRecordAcl(
  config: RecordPermissionCliContainerConfig,
): Promise<RecordPermissionContainer> {
  const container = createRecordPermissionCliContainer(config);

  const s = p.spinner();
  s.start("Applying record access permissions...");
  await applyRecordPermission({ container });
  s.stop("Record access permissions applied.");

  p.log.success("Record access permissions applied successfully.");

  return container;
}

export default define({
  name: "apply",
  description: "Apply record access permissions from YAML to kintone app",
  args: { ...recordAclArgs, ...confirmArgs },
  run: async (ctx) => {
    try {
      const values = ctx.values as WithConfirm<RecordAclCliValues>;
      const skipConfirm = values.yes === true;

      await routeMultiApp(values, {
        singleLegacy: async () => {
          const config = resolveRecordAclContainerConfig(values);
          const container = await runRecordAcl(config);
          await confirmAndDeploy([container], skipConfirm);
        },
        singleApp: async (app, projectConfig) => {
          const config = resolveRecordAclAppContainerConfig(
            app,
            projectConfig,
            values,
          );
          const container = await runRecordAcl(config);
          await confirmAndDeploy([container], skipConfirm);
        },
        multiApp: async (plan, projectConfig) => {
          const containers: Deployable[] = [];
          await runMultiAppWithHeaders(plan, async (app) => {
            const config = resolveRecordAclAppContainerConfig(
              app,
              projectConfig,
              values,
            );
            const container = await runRecordAcl(config);
            containers.push({
              appDeployer: container.appDeployer,
              appName: app.name,
            });
          });
          await confirmAndDeploy(containers, skipConfirm);
        },
      });
    } catch (error) {
      handleCliError(error);
    }
  },
});
