import * as p from "@clack/prompts";
import { define } from "gunshi";
import {
  createReportCliContainer,
  type ReportCliContainerConfig,
} from "@/core/application/container/reportCli";
import { detectReportThreeWayDiff } from "@/core/application/report/detectReportThreeWayDiff";
import { handleCliError } from "../../handleError";
import {
  printAppHeader,
  printReportDiffResult,
  printThreeWayDiffResult,
} from "../../output";
import { routeMultiApp, runMultiAppWithFailCheck } from "../../projectConfig";
import {
  reportArgs,
  resolveReportAppContainerConfig,
  resolveReportContainerConfig,
} from "../../reportConfig";

async function runDiff(
  containerConfig: ReportCliContainerConfig,
): Promise<void> {
  const container = createReportCliContainer(containerConfig);

  const s = p.spinner();
  s.start("Comparing report settings...");
  let result: Awaited<ReturnType<typeof detectReportThreeWayDiff>>;
  try {
    result = await detectReportThreeWayDiff({ container });
  } catch (error) {
    s.stop("Comparison failed.");
    throw error;
  }
  s.stop("Comparison complete.");

  printThreeWayDiffResult(result, printReportDiffResult);
}

export default define({
  name: "diff",
  description: "Compare local report config with remote kintone app (3-way)",
  args: reportArgs,
  run: async (ctx) => {
    try {
      await routeMultiApp(ctx.values, {
        singleLegacy: async () => {
          await runDiff(resolveReportContainerConfig(ctx.values));
        },
        singleApp: async (app, projectConfig) => {
          await runDiff(
            resolveReportAppContainerConfig(app, projectConfig, ctx.values),
          );
        },
        multiApp: async (plan, projectConfig) => {
          await runMultiAppWithFailCheck(
            plan,
            async (app) => {
              printAppHeader(app.name, app.appId);
              await runDiff(
                resolveReportAppContainerConfig(app, projectConfig, ctx.values),
              );
            },
            "All report diffs completed successfully.",
          );
        },
      });
    } catch (error) {
      handleCliError(error);
    }
  },
});
