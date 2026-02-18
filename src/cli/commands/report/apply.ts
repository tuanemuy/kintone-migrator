import * as p from "@clack/prompts";
import { define } from "gunshi";
import type { ReportContainer } from "@/core/application/container/report";
import {
  createReportCliContainer,
  type ReportCliContainerConfig,
} from "@/core/application/container/reportCli";
import { applyReport } from "@/core/application/report/applyReport";
import { confirmArgs } from "../../config";
import { handleCliError } from "../../handleError";
import { confirmAndDeploy, printAppHeader } from "../../output";
import { routeMultiApp, runMultiAppWithFailCheck } from "../../projectConfig";
import {
  type ReportCliValues,
  reportArgs,
  resolveReportAppContainerConfig,
  resolveReportContainerConfig,
} from "../../reportConfig";

async function runReport(
  config: ReportCliContainerConfig,
): Promise<ReportContainer> {
  const container = createReportCliContainer(config);

  const s = p.spinner();
  s.start("Applying report settings...");
  await applyReport({ container });
  s.stop("Report settings applied.");

  p.log.success("Report settings applied successfully.");

  return container;
}

export default define({
  name: "apply",
  description: "Apply report settings from YAML to kintone app",
  args: { ...reportArgs, ...confirmArgs },
  run: async (ctx) => {
    try {
      const values = ctx.values as ReportCliValues & { yes?: boolean };
      const skipConfirm = values.yes === true;

      await routeMultiApp(values, {
        singleLegacy: async () => {
          const config = resolveReportContainerConfig(values);
          const container = await runReport(config);
          await confirmAndDeploy([container], skipConfirm);
        },
        singleApp: async (app, projectConfig) => {
          const config = resolveReportAppContainerConfig(
            app,
            projectConfig,
            values,
          );
          const container = await runReport(config);
          await confirmAndDeploy([container], skipConfirm);
        },
        multiApp: async (plan, projectConfig) => {
          const containers: ReportContainer[] = [];
          await runMultiAppWithFailCheck(
            plan,
            async (app) => {
              const config = resolveReportAppContainerConfig(
                app,
                projectConfig,
                values,
              );
              printAppHeader(app.name, app.appId);
              const container = await runReport(config);
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
