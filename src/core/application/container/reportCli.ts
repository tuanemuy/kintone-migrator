import type { KintoneRestAPIClient } from "@kintone/rest-api-client";
import { KintoneAppDeployer } from "@/core/adapters/kintone/appDeployer";
import { KintoneReportConfigurator } from "@/core/adapters/kintone/reportConfigurator";
import { createLocalFileReportStorage } from "@/core/adapters/local/reportStorage";
import type { KintoneAuth } from "./cli";
import { createKintoneClient } from "./kintoneClient";
import type { ReportContainer } from "./report";

export type ReportCliContainerConfig = {
  baseUrl: string;
  auth: KintoneAuth;
  appId: string;
  guestSpaceId?: string;
  reportFilePath: string;
  client?: KintoneRestAPIClient;
};

export function createReportCliContainer(
  config: ReportCliContainerConfig,
): ReportContainer {
  const client = config.client ?? createKintoneClient(config);

  return {
    reportConfigurator: new KintoneReportConfigurator(client, config.appId),
    reportStorage: createLocalFileReportStorage(config.reportFilePath),
    appDeployer: new KintoneAppDeployer(client, config.appId),
  };
}
