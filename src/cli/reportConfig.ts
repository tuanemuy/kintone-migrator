import type { ReportCliContainerConfig } from "@/core/application/container/reportCli";
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
} = createDomainConfigResolver({
  fileArgKey: "report-file",
  envVar: () => process.env.REPORT_FILE_PATH,
  appFileField: (a) => a.reportFile,
  defaultDir: "report",
  defaultFileName: "reports.yaml",
  buildConfig: (base, filePath): ReportCliContainerConfig => ({
    ...base,
    reportFilePath: filePath,
  }),
});

export {
  resolveReportFilePath,
  resolveReportContainerConfig,
  resolveReportAppContainerConfig,
};
