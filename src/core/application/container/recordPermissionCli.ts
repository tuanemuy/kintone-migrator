import type { KintoneRestAPIClient } from "@kintone/rest-api-client";
import { KintoneAppDeployer } from "@/core/adapters/kintone/appDeployer";
import { KintoneAppRevisionReader } from "@/core/adapters/kintone/appRevisionReader";
import { KintoneRecordPermissionConfigurator } from "@/core/adapters/kintone/recordPermissionConfigurator";
import { createLocalFileAppRevisionStorage } from "@/core/adapters/local/appRevisionStorage";
import { createLocalFileRecordPermissionStateStorage } from "@/core/adapters/local/recordPermissionStateStorage";
import { createLocalFileRecordPermissionStorage } from "@/core/adapters/local/recordPermissionStorage";
import { configCodec } from "@/core/adapters/yaml/configCodec";
import type { RecordPermissionContainer } from "@/core/application/container/recordPermission";
import type { KintoneAuth } from "./cli";
import { createKintoneClient } from "./kintoneClient";

export type RecordPermissionCliContainerConfig = {
  baseUrl: string;
  auth: KintoneAuth;
  appId: string;
  guestSpaceId?: string;
  recordAclFilePath: string;
  recordAclStateFilePath: string;
  appRevisionFilePath: string;
  client?: KintoneRestAPIClient;
};

export function createRecordPermissionCliContainer(
  config: RecordPermissionCliContainerConfig,
): RecordPermissionContainer {
  const client = config.client ?? createKintoneClient(config);

  return {
    configCodec,
    recordPermissionConfigurator: new KintoneRecordPermissionConfigurator(
      client,
      config.appId,
    ),
    recordPermissionStorage: createLocalFileRecordPermissionStorage(
      config.recordAclFilePath,
    ),
    recordPermissionStateStorage: createLocalFileRecordPermissionStateStorage(
      config.recordAclStateFilePath,
    ),
    appRevisionStorage: createLocalFileAppRevisionStorage(
      config.appRevisionFilePath,
    ),
    appRevisionReader: new KintoneAppRevisionReader(client, config.appId),
    appDeployer: new KintoneAppDeployer(client, config.appId),
  };
}
