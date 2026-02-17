import { KintoneRestAPIClient } from "@kintone/rest-api-client";
import { KintoneAppDeployer } from "@/core/adapters/kintone/appDeployer";
import { KintoneRecordPermissionConfigurator } from "@/core/adapters/kintone/recordPermissionConfigurator";
import { LocalFileRecordPermissionStorage } from "@/core/adapters/local/recordPermissionStorage";
import type { RecordPermissionContainer } from "@/core/application/container/recordPermission";
import { buildKintoneAuth, type KintoneAuth } from "./cli";

export type RecordPermissionCliContainerConfig = {
  baseUrl: string;
  auth: KintoneAuth;
  appId: string;
  guestSpaceId?: string;
  recordAclFilePath: string;
};

export function createRecordPermissionCliContainer(
  config: RecordPermissionCliContainerConfig,
): RecordPermissionContainer {
  const client = new KintoneRestAPIClient({
    baseUrl: config.baseUrl,
    auth: buildKintoneAuth(config.auth),
    guestSpaceId: config.guestSpaceId,
  });

  return {
    recordPermissionConfigurator: new KintoneRecordPermissionConfigurator(
      client,
      config.appId,
    ),
    recordPermissionStorage: new LocalFileRecordPermissionStorage(
      config.recordAclFilePath,
    ),
    appDeployer: new KintoneAppDeployer(client, config.appId),
  };
}
