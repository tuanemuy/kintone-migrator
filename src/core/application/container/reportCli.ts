import type { KintoneRestAPIClient } from "@kintone/rest-api-client";
import { KintoneAppDeployer } from "@/core/adapters/kintone/appDeployer";
import { KintoneAppRevisionReader } from "@/core/adapters/kintone/appRevisionReader";
import { KintoneReportConfigurator } from "@/core/adapters/kintone/reportConfigurator";
import { createLocalFileAppRevisionStorage } from "@/core/adapters/local/appRevisionStorage";
import { createLocalFileReportStateStorage } from "@/core/adapters/local/reportStateStorage";
import { createLocalFileReportStorage } from "@/core/adapters/local/reportStorage";
import { configCodec } from "@/core/adapters/yaml/configCodec";
import type { KintoneAuth } from "./cli";
import { createKintoneClient } from "./kintoneClient";
import type { ReportContainer } from "./report";

export type ReportCliContainerConfig = {
  baseUrl: string;
  auth: KintoneAuth;
  appId: string;
  guestSpaceId?: string;
  reportFilePath: string;
  reportStateFilePath: string;
  appRevisionFilePath: string;
  client?: KintoneRestAPIClient;
};

export function createReportCliContainer(
  config: ReportCliContainerConfig,
): ReportContainer {
  const client = config.client ?? createKintoneClient(config);

  return {
    configCodec,
    reportConfigurator: new KintoneReportConfigurator(client, config.appId),
    reportStorage: createLocalFileReportStorage(config.reportFilePath),
    reportStateStorage: createLocalFileReportStateStorage(
      config.reportStateFilePath,
    ),
    appRevisionStorage: createLocalFileAppRevisionStorage(
      config.appRevisionFilePath,
    ),
    appRevisionReader: new KintoneAppRevisionReader(client, config.appId),
    appDeployer: new KintoneAppDeployer(client, config.appId),
  };
}
