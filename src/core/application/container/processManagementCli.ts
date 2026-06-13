import type { KintoneRestAPIClient } from "@kintone/rest-api-client";
import { KintoneAppDeployer } from "@/core/adapters/kintone/appDeployer";
import { KintoneAppRevisionReader } from "@/core/adapters/kintone/appRevisionReader";
import { KintoneProcessManagementConfigurator } from "@/core/adapters/kintone/processManagementConfigurator";
import { createLocalFileAppRevisionStorage } from "@/core/adapters/local/appRevisionStorage";
import { createLocalFileProcessManagementStateStorage } from "@/core/adapters/local/processManagementStateStorage";
import { createLocalFileProcessManagementStorage } from "@/core/adapters/local/processManagementStorage";
import { configCodec } from "@/core/adapters/yaml/configCodec";
import type { KintoneAuth } from "./cli";
import { createKintoneClient } from "./kintoneClient";
import type { ProcessManagementContainer } from "./processManagement";

export type ProcessManagementCliContainerConfig = {
  baseUrl: string;
  auth: KintoneAuth;
  appId: string;
  guestSpaceId?: string;
  processFilePath: string;
  processStateFilePath: string;
  appRevisionFilePath: string;
  client?: KintoneRestAPIClient;
};

export function createProcessManagementCliContainer(
  config: ProcessManagementCliContainerConfig,
): ProcessManagementContainer {
  const client = config.client ?? createKintoneClient(config);

  return {
    configCodec,
    processManagementConfigurator: new KintoneProcessManagementConfigurator(
      client,
      config.appId,
    ),
    processManagementStorage: createLocalFileProcessManagementStorage(
      config.processFilePath,
    ),
    processManagementStateStorage: createLocalFileProcessManagementStateStorage(
      config.processStateFilePath,
    ),
    appRevisionStorage: createLocalFileAppRevisionStorage(
      config.appRevisionFilePath,
    ),
    appRevisionReader: new KintoneAppRevisionReader(client, config.appId),
    appDeployer: new KintoneAppDeployer(client, config.appId),
  };
}
