import { createReportCliContainer } from "@/core/application/container/reportCli";
import { applyReport } from "@/core/application/report/applyReport";
import {
  reportArgs,
  resolveReportAppContainerConfig,
  resolveReportContainerConfig,
} from "../../reportConfig";
import { createApplyCommand } from "../applyCommandFactory";

export default createApplyCommand({
  description: "Apply report settings from YAML to kintone app",
  args: reportArgs,
  spinnerMessage: "Applying report settings...",
  spinnerStopMessage: "Report settings applied.",
  successMessage: "Report settings applied successfully.",
  createContainer: createReportCliContainer,
  applyFn: applyReport,
  resolveContainerConfig: resolveReportContainerConfig,
  resolveAppContainerConfig: resolveReportAppContainerConfig,
});
