import type { KintoneRestAPIClient } from "@kintone/rest-api-client";
import { KintoneAppDeployer } from "@/core/adapters/kintone/appDeployer";
import { KintoneAppPermissionConfigurator } from "@/core/adapters/kintone/appPermissionConfigurator";
import { KintoneAppRevisionReader } from "@/core/adapters/kintone/appRevisionReader";
import { createLocalFileAppPermissionStateStorage } from "@/core/adapters/local/appPermissionStateStorage";
import { createLocalFileAppPermissionStorage } from "@/core/adapters/local/appPermissionStorage";
import { createLocalFileAppRevisionStorage } from "@/core/adapters/local/appRevisionStorage";
import { configCodec } from "@/core/adapters/yaml/configCodec";
import type { AppPermissionContainer } from "@/core/application/container/appPermission";
import type { KintoneAuth } from "@/core/application/container/cli";
import { createKintoneClient } from "./kintoneClient";

export type AppPermissionCliContainerConfig = {
  baseUrl: string;
  auth: KintoneAuth;
  appId: string;
  guestSpaceId?: string;
  appAclFilePath: string;
  appAclStateFilePath: string;
  appRevisionFilePath: string;
  client?: KintoneRestAPIClient;
};

export function createAppPermissionCliContainer(
  config: AppPermissionCliContainerConfig,
): AppPermissionContainer {
  const client = config.client ?? createKintoneClient(config);

  return {
    configCodec,
    appPermissionConfigurator: new KintoneAppPermissionConfigurator(
      client,
      config.appId,
    ),
    appPermissionStorage: createLocalFileAppPermissionStorage(
      config.appAclFilePath,
    ),
    appPermissionStateStorage: createLocalFileAppPermissionStateStorage(
      config.appAclStateFilePath,
    ),
    appRevisionStorage: createLocalFileAppRevisionStorage(
      config.appRevisionFilePath,
    ),
    appRevisionReader: new KintoneAppRevisionReader(client, config.appId),
    appDeployer: new KintoneAppDeployer(client, config.appId),
  };
}
