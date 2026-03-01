import { createReportCliContainer } from "@/core/application/container/reportCli";
import { detectReportDiff } from "@/core/application/report/detectReportDiff";
import { printReportDiffResult } from "../../output";
import {
  reportArgs,
  resolveReportAppContainerConfig,
  resolveReportContainerConfig,
} from "../../reportConfig";
import { createDiffCommand } from "../diffCommandFactory";

export default createDiffCommand({
  description: "Compare local report config with remote kintone app",
  args: reportArgs,
  spinnerMessage: "Comparing report settings...",
  multiAppSuccessMessage: "All report diffs completed successfully.",
  createContainer: createReportCliContainer,
  detectDiff: detectReportDiff,
  printResult: printReportDiffResult,
  resolveContainerConfig: resolveReportContainerConfig,
  resolveAppContainerConfig: resolveReportAppContainerConfig,
});
