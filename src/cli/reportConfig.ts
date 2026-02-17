import type { ReportCliContainerConfig } from "@/core/application/container/reportCli";
import type {
  AppEntry,
  ProjectConfig,
} from "@/core/domain/projectConfig/entity";
import { kintoneArgs, multiAppArgs, resolveConfig } from "./config";
import { type MultiAppCliValues, resolveAppCliConfig } from "./projectConfig";

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

export function resolveReportFilePath(
  cliValues: ReportCliValues,
  app?: AppEntry,
): string {
  return (
    cliValues["report-file"] ??
    process.env.REPORT_FILE_PATH ??
    (app ? `report/${app.name}.yaml` : "reports.yaml")
  );
}

export function resolveReportContainerConfig(
  cliValues: ReportCliValues,
): ReportCliContainerConfig {
  const config = resolveConfig(cliValues);
  return {
    baseUrl: config.baseUrl,
    auth: config.auth,
    appId: config.appId,
    guestSpaceId: config.guestSpaceId,
    reportFilePath: resolveReportFilePath(cliValues),
  };
}

export function resolveReportAppContainerConfig(
  app: AppEntry,
  projectConfig: ProjectConfig,
  cliValues: ReportCliValues,
): ReportCliContainerConfig {
  const config = resolveAppCliConfig(app, projectConfig, cliValues);
  return {
    baseUrl: config.baseUrl,
    auth: config.auth,
    appId: config.appId,
    guestSpaceId: config.guestSpaceId,
    reportFilePath: resolveReportFilePath(cliValues, app),
  };
}
