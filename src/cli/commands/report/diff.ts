import * as p from "@clack/prompts";
import { define } from "gunshi";
import {
  createReportCliContainer,
  type ReportCliContainerConfig,
} from "@/core/application/container/reportCli";
import { detectReportDiff } from "@/core/application/report/detectReportDiff";
import { handleCliError } from "../../handleError";
import { printAppHeader, printReportDiffResult } from "../../output";
import { routeMultiApp, runMultiAppWithFailCheck } from "../../projectConfig";
import {
  type ReportCliValues,
  reportArgs,
  resolveReportAppContainerConfig,
  resolveReportContainerConfig,
} from "../../reportConfig";

async function runDiff(config: ReportCliContainerConfig): Promise<void> {
  const container = createReportCliContainer(config);

  const s = p.spinner();
  s.start("Comparing report settings...");
  const result = await detectReportDiff({ container });
  s.stop("Comparison complete.");

  printReportDiffResult(result);
}

export default define({
  name: "diff",
  description: "Compare local report config with remote kintone app",
  args: reportArgs,
  run: async (ctx) => {
    try {
      const values = ctx.values as ReportCliValues;

      await routeMultiApp(values, {
        singleLegacy: async () => {
          const config = resolveReportContainerConfig(values);
          await runDiff(config);
        },
        singleApp: async (app, projectConfig) => {
          const config = resolveReportAppContainerConfig(
            app,
            projectConfig,
            values,
          );
          await runDiff(config);
        },
        multiApp: async (plan, projectConfig) => {
          await runMultiAppWithFailCheck(plan, async (app) => {
            const config = resolveReportAppContainerConfig(
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
