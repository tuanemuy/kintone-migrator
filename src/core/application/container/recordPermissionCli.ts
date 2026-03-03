import type { KintoneRestAPIClient } from "@kintone/rest-api-client";
import { KintoneAppDeployer } from "@/core/adapters/kintone/appDeployer";
import { KintoneRecordPermissionConfigurator } from "@/core/adapters/kintone/recordPermissionConfigurator";
import { createLocalFileRecordPermissionStorage } from "@/core/adapters/local/recordPermissionStorage";
import type { RecordPermissionContainer } from "@/core/application/container/recordPermission";
import type { KintoneAuth } from "./cli";
import { createKintoneClient } from "./kintoneClient";

export type RecordPermissionCliContainerConfig = {
  baseUrl: string;
  auth: KintoneAuth;
  appId: string;
  guestSpaceId?: string;
  recordAclFilePath: string;
  client?: KintoneRestAPIClient;
};

export function createRecordPermissionCliContainer(
  config: RecordPermissionCliContainerConfig,
): RecordPermissionContainer {
  const client = config.client ?? createKintoneClient(config);

  return {
    recordPermissionConfigurator: new KintoneRecordPermissionConfigurator(
      client,
      config.appId,
    ),
    recordPermissionStorage: createLocalFileRecordPermissionStorage(
      config.recordAclFilePath,
    ),
    appDeployer: new KintoneAppDeployer(client, config.appId),
  };
}
