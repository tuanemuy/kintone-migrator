import { createReportCliContainer } from "@/core/application/container/reportCli";
import { captureReport } from "@/core/application/report/captureReport";
import { saveReport } from "@/core/application/report/saveReport";
import {
  reportArgs,
  resolveReportAppContainerConfig,
  resolveReportContainerConfig,
} from "../../reportConfig";
import { createCaptureCommand } from "../captureCommandFactory";

export default createCaptureCommand({
  description: "Capture current report settings from kintone app to file",
  args: reportArgs,
  spinnerMessage: "Capturing report settings...",
  spinnerStopMessage: "Report settings captured.",
  domainLabel: "Reports",
  multiAppSuccessMessage: "All report captures completed successfully.",
  createContainer: createReportCliContainer,
  captureFn: captureReport,
  saveFn: saveReport,
  getConfigFilePath: (config) => config.reportFilePath,
  resolveContainerConfig: resolveReportContainerConfig,
  resolveAppContainerConfig: resolveReportAppContainerConfig,
});
