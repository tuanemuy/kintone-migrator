import { kintoneArgs, multiAppArgs } from "./config";
import { createDomainConfigResolver } from "./createDomainConfigResolver";
import type { MultiAppCliValues } from "./projectConfig";

export const reportArgs = {
  ...kintoneArgs,
  ...multiAppArgs,
  "report-file": {
    type: "string" as const,
    description: "Report file path (default: reports.yaml)",
  },
};

export type ReportCliValues = MultiAppCliValues & {
  "report-file"?: string;
};

const {
  resolveFilePath: resolveReportFilePath,
  resolveContainerConfig: resolveReportContainerConfig,
  resolveAppContainerConfig: resolveReportAppContainerConfig,
} = createDomainConfigResolver<
  "report-file",
  "reportFilePath",
  ReportCliValues
>({
  fileArgKey: "report-file",
  envVar: () => process.env.REPORT_FILE_PATH,
  appFileField: (a) => a.reportFile,
  defaultDir: "report",
  defaultFileName: "reports.yaml",
  filePathKey: "reportFilePath",
});

export {
  resolveReportFilePath,
  resolveReportContainerConfig,
  resolveReportAppContainerConfig,
};
