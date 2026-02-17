import { KintoneRestAPIClient } from "@kintone/rest-api-client";
import { KintoneAppDeployer } from "@/core/adapters/kintone/appDeployer";
import { KintoneReportConfigurator } from "@/core/adapters/kintone/reportConfigurator";
import { LocalFileReportStorage } from "@/core/adapters/local/reportStorage";
import { buildKintoneAuth, type KintoneAuth } from "./cli";
import type { ReportContainer } from "./report";

export type ReportCliContainerConfig = {
  baseUrl: string;
  auth: KintoneAuth;
  appId: string;
  guestSpaceId?: string;
  reportFilePath: string;
};

export function createReportCliContainer(
  config: ReportCliContainerConfig,
): ReportContainer {
  const client = new KintoneRestAPIClient({
    baseUrl: config.baseUrl,
    auth: buildKintoneAuth(config.auth),
    guestSpaceId: config.guestSpaceId,
  });

  return {
    reportConfigurator: new KintoneReportConfigurator(client, config.appId),
    reportStorage: new LocalFileReportStorage(config.reportFilePath),
    appDeployer: new KintoneAppDeployer(client, config.appId),
  };
}
