import { KintoneRestAPIClient } from "@kintone/rest-api-client";
import { KintoneAppDeployer } from "@/core/adapters/kintone/appDeployer";
import { KintoneProcessManagementConfigurator } from "@/core/adapters/kintone/processManagementConfigurator";
import { createLocalFileProcessManagementStorage } from "@/core/adapters/local/processManagementStorage";
import { buildKintoneAuth, type KintoneAuth } from "./cli";
import type { ProcessManagementContainer } from "./processManagement";

export type ProcessManagementCliContainerConfig = {
  baseUrl: string;
  auth: KintoneAuth;
  appId: string;
  guestSpaceId?: string;
  processFilePath: string;
};

export function createProcessManagementCliContainer(
  config: ProcessManagementCliContainerConfig,
): ProcessManagementContainer {
  const client = new KintoneRestAPIClient({
    baseUrl: config.baseUrl,
    auth: buildKintoneAuth(config.auth),
    guestSpaceId: config.guestSpaceId,
  });

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
