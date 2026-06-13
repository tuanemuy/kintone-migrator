import type { ReportCliContainerConfig } from "@/core/application/container/reportCli";
import {
  buildAppRevisionFilePath,
  buildDomainStateFilePath,
  buildLegacyAppRevisionFilePath,
  buildLegacyDomainStateFilePath,
} from "@/core/domain/projectConfig/appFilePaths";
import { kintoneArgs, multiAppArgs } from "./config";
import { createDomainConfigResolver } from "./createDomainConfigResolver";
import type { MultiAppCliValues } from "./projectConfig";

const REPORT_STATE_FILE = "report.yaml";

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
  buildConfig: (base, filePath, app): ReportCliContainerConfig => ({
    ...base,
    reportFilePath: filePath,
    // State (base snapshot) and the app-scoped revision live under
    // state/<appName>/ for project apps, or state/ for legacy single-app mode
    // (ADR-188-001).
    reportStateFilePath: app
      ? buildDomainStateFilePath(app.name, REPORT_STATE_FILE)
      : buildLegacyDomainStateFilePath(REPORT_STATE_FILE),
    appRevisionFilePath: app
      ? buildAppRevisionFilePath(app.name)
      : buildLegacyAppRevisionFilePath(),
  }),
});

export {
  resolveReportFilePath,
  resolveReportContainerConfig,
  resolveReportAppContainerConfig,
};
