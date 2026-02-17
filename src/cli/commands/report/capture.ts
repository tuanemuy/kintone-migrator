import * as p from "@clack/prompts";
import { define } from "gunshi";
import pc from "picocolors";
import {
  createReportCliContainer,
  type ReportCliContainerConfig,
} from "@/core/application/container/reportCli";
import { captureReport } from "@/core/application/report/captureReport";
import { saveReport } from "@/core/application/report/saveReport";
import { handleCliError } from "../../handleError";
import { printAppHeader } from "../../output";
import { routeMultiApp, runMultiAppWithFailCheck } from "../../projectConfig";
import {
  type ReportCliValues,
  reportArgs,
  resolveReportAppContainerConfig,
  resolveReportContainerConfig,
} from "../../reportConfig";

async function runCaptureReport(
  config: ReportCliContainerConfig,
): Promise<void> {
  const container = createReportCliContainer(config);

  const s = p.spinner();
  s.start("Capturing report settings...");
  const result = await captureReport({ container });
  s.stop("Report settings captured.");

  await saveReport({
    container,
    input: { configText: result.configText },
  });

  p.log.success(`Reports saved to: ${pc.cyan(config.reportFilePath)}`);

  if (result.hasExistingConfig) {
    p.log.warn("Existing report file was overwritten.");
  }
}

export default define({
  name: "capture",
  description: "Capture current report settings from kintone app to file",
  args: reportArgs,
  run: async (ctx) => {
    try {
      const values = ctx.values as ReportCliValues;

      await routeMultiApp(values, {
        singleLegacy: async () => {
          const config = resolveReportContainerConfig(values);
          await runCaptureReport(config);
        },
        singleApp: async (app, projectConfig) => {
          const config = resolveReportAppContainerConfig(
            app,
            projectConfig,
            values,
          );
          await runCaptureReport(config);
        },
        multiApp: async (plan, projectConfig) => {
          await runMultiAppWithFailCheck(
            plan,
            async (app) => {
              const config = resolveReportAppContainerConfig(
                app,
                projectConfig,
                values,
              );
              printAppHeader(app.name, app.appId);
              await runCaptureReport(config);
            },
            "All report captures completed successfully.",
          );
        },
      });
    } catch (error) {
      handleCliError(error);
    }
  },
});
