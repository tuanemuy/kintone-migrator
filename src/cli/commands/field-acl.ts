import * as p from "@clack/prompts";
import { define } from "gunshi";
import {
  createFieldPermissionCliContainer,
  type FieldPermissionCliContainerConfig,
} from "@/core/application/container/cli";
import type { FieldPermissionContainer } from "@/core/application/container/fieldPermission";
import { applyFieldPermission } from "@/core/application/fieldPermission/applyFieldPermission";
import { confirmArgs } from "../config";
import {
  type FieldAclCliValues,
  fieldAclArgs,
  resolveFieldAclAppContainerConfig,
  resolveFieldAclContainerConfig,
} from "../fieldAclConfig";
import { handleCliError } from "../handleError";
import { printAppHeader } from "../output";
import { routeMultiApp, runMultiAppWithFailCheck } from "../projectConfig";

async function runFieldAcl(
  config: FieldPermissionCliContainerConfig,
): Promise<FieldPermissionContainer> {
  const container = createFieldPermissionCliContainer(config);

  const s = p.spinner();
  s.start("Applying field access permissions...");
  await applyFieldPermission({ container });
  s.stop("Field access permissions applied.");

  p.log.success("Field access permissions applied successfully.");

  return container;
}

async function confirmAndDeploy(
  containers: readonly FieldPermissionContainer[],
  skipConfirm: boolean,
): Promise<void> {
  if (!skipConfirm) {
    const shouldDeploy = await p.confirm({
      message: "運用環境に反映しますか？",
    });

    if (p.isCancel(shouldDeploy) || !shouldDeploy) {
      p.log.warn(
        "テスト環境に反映済みですが、運用環境には反映されていません。",
      );
      return;
    }
  }

  const ds = p.spinner();
  ds.start("運用環境に反映しています...");
  for (const container of containers) {
    await container.appDeployer.deploy();
  }
  ds.stop("運用環境への反映が完了しました。");

  p.log.success("運用環境への反映が完了しました。");
}

export default define({
  name: "field-acl",
  description: "Apply field access permissions from YAML to kintone app",
  args: { ...fieldAclArgs, ...confirmArgs },
  run: async (ctx) => {
    try {
      const values = ctx.values as FieldAclCliValues & { yes?: boolean };
      const skipConfirm = values.yes === true;

      await routeMultiApp(values, {
        singleLegacy: async () => {
          const config = resolveFieldAclContainerConfig(values);
          const container = await runFieldAcl(config);
          await confirmAndDeploy([container], skipConfirm);
        },
        singleApp: async (app, projectConfig) => {
          const config = resolveFieldAclAppContainerConfig(
            app,
            projectConfig,
            values,
          );
          const container = await runFieldAcl(config);
          await confirmAndDeploy([container], skipConfirm);
        },
        multiApp: async (plan, projectConfig) => {
          const containers: FieldPermissionContainer[] = [];
          await runMultiAppWithFailCheck(
            plan,
            async (app) => {
              const config = resolveFieldAclAppContainerConfig(
                app,
                projectConfig,
                values,
              );
              printAppHeader(app.name, app.appId);
              const container = await runFieldAcl(config);
              containers.push(container);
            },
            undefined,
          );
          await confirmAndDeploy(containers, skipConfirm);
        },
      });
    } catch (error) {
      handleCliError(error);
    }
  },
});
