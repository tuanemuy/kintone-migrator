import { KintoneRestAPIClient } from "@kintone/rest-api-client";
import { KintoneAppDeployer } from "@/core/adapters/kintone/appDeployer";
import { KintoneAppPermissionConfigurator } from "@/core/adapters/kintone/appPermissionConfigurator";
import { LocalFileAppPermissionStorage } from "@/core/adapters/local/appPermissionStorage";
import type { AppPermissionContainer } from "@/core/application/container/appPermission";
import type { KintoneAuth } from "@/core/application/container/cli";
import { buildKintoneAuth } from "@/core/application/container/cli";

export type AppPermissionCliContainerConfig = {
  baseUrl: string;
  auth: KintoneAuth;
  appId: string;
  guestSpaceId?: string;
  appAclFilePath: string;
};

export function createAppPermissionCliContainer(
  config: AppPermissionCliContainerConfig,
): AppPermissionContainer {
  const client = new KintoneRestAPIClient({
    baseUrl: config.baseUrl,
    auth: buildKintoneAuth(config.auth),
    guestSpaceId: config.guestSpaceId,
  });

  return {
    appPermissionConfigurator: new KintoneAppPermissionConfigurator(
      client,
      config.appId,
    ),
    appPermissionStorage: new LocalFileAppPermissionStorage(
      config.appAclFilePath,
    ),
    appDeployer: new KintoneAppDeployer(client, config.appId),
  };
}
