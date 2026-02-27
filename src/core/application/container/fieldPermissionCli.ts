import { KintoneRestAPIClient } from "@kintone/rest-api-client";
import { KintoneAppDeployer } from "@/core/adapters/kintone/appDeployer";
import { KintoneFieldPermissionConfigurator } from "@/core/adapters/kintone/fieldPermissionConfigurator";
import { createLocalFileFieldPermissionStorage } from "@/core/adapters/local/fieldPermissionStorage";
import type { KintoneAuth } from "@/core/application/container/cli";
import { buildKintoneAuth } from "@/core/application/container/cli";
import type { FieldPermissionContainer } from "@/core/application/container/fieldPermission";

export type FieldPermissionCliContainerConfig = {
  baseUrl: string;
  auth: KintoneAuth;
  appId: string;
  guestSpaceId?: string;
  fieldAclFilePath: string;
};

export function createFieldPermissionCliContainer(
  config: FieldPermissionCliContainerConfig,
): FieldPermissionContainer {
  const client = new KintoneRestAPIClient({
    baseUrl: config.baseUrl,
    auth: buildKintoneAuth(config.auth),
    guestSpaceId: config.guestSpaceId,
  });

  return {
    fieldPermissionConfigurator: new KintoneFieldPermissionConfigurator(
      client,
      config.appId,
    ),
    fieldPermissionStorage: createLocalFileFieldPermissionStorage(
      config.fieldAclFilePath,
    ),
    appDeployer: new KintoneAppDeployer(client, config.appId),
  };
}
