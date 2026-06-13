import type { KintoneRestAPIClient } from "@kintone/rest-api-client";
import { KintoneAppDeployer } from "@/core/adapters/kintone/appDeployer";
import { KintoneAppRevisionReader } from "@/core/adapters/kintone/appRevisionReader";
import { KintoneFieldPermissionConfigurator } from "@/core/adapters/kintone/fieldPermissionConfigurator";
import { createLocalFileAppRevisionStorage } from "@/core/adapters/local/appRevisionStorage";
import { createLocalFileFieldPermissionStateStorage } from "@/core/adapters/local/fieldPermissionStateStorage";
import { createLocalFileFieldPermissionStorage } from "@/core/adapters/local/fieldPermissionStorage";
import { configCodec } from "@/core/adapters/yaml/configCodec";
import type { KintoneAuth } from "@/core/application/container/cli";
import type { FieldPermissionContainer } from "@/core/application/container/fieldPermission";
import { createKintoneClient } from "./kintoneClient";

export type FieldPermissionCliContainerConfig = {
  baseUrl: string;
  auth: KintoneAuth;
  appId: string;
  guestSpaceId?: string;
  fieldAclFilePath: string;
  fieldAclStateFilePath: string;
  appRevisionFilePath: string;
  client?: KintoneRestAPIClient;
};

export function createFieldPermissionCliContainer(
  config: FieldPermissionCliContainerConfig,
): FieldPermissionContainer {
  const client = config.client ?? createKintoneClient(config);

  return {
    configCodec,
    fieldPermissionConfigurator: new KintoneFieldPermissionConfigurator(
      client,
      config.appId,
    ),
    fieldPermissionStorage: createLocalFileFieldPermissionStorage(
      config.fieldAclFilePath,
    ),
    fieldPermissionStateStorage: createLocalFileFieldPermissionStateStorage(
      config.fieldAclStateFilePath,
    ),
    appRevisionStorage: createLocalFileAppRevisionStorage(
      config.appRevisionFilePath,
    ),
    appRevisionReader: new KintoneAppRevisionReader(client, config.appId),
    appDeployer: new KintoneAppDeployer(client, config.appId),
  };
}
