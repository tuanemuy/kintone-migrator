import type { KintoneRestAPIClient } from "@kintone/rest-api-client";
import { KintoneAppDeployer } from "@/core/adapters/kintone/appDeployer";
import { KintoneProcessManagementConfigurator } from "@/core/adapters/kintone/processManagementConfigurator";
import { createLocalFileProcessManagementStorage } from "@/core/adapters/local/processManagementStorage";
import type { KintoneAuth } from "./cli";
import { createKintoneClient } from "./kintoneClient";
import type { ProcessManagementContainer } from "./processManagement";

export type ProcessManagementCliContainerConfig = {
  baseUrl: string;
  auth: KintoneAuth;
  appId: string;
  guestSpaceId?: string;
  processFilePath: string;
  client?: KintoneRestAPIClient;
};

export function createProcessManagementCliContainer(
  config: ProcessManagementCliContainerConfig,
): ProcessManagementContainer {
  const client = config.client ?? createKintoneClient(config);

  return {
    processManagementConfigurator: new KintoneProcessManagementConfigurator(
      client,
      config.appId,
    ),
    processManagementStorage: createLocalFileProcessManagementStorage(
      config.processFilePath,
    ),
    appDeployer: new KintoneAppDeployer(client, config.appId),
  };
}
