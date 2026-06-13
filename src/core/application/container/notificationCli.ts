import type { KintoneRestAPIClient } from "@kintone/rest-api-client";
import { KintoneAppDeployer } from "@/core/adapters/kintone/appDeployer";
import { KintoneAppRevisionReader } from "@/core/adapters/kintone/appRevisionReader";
import { KintoneNotificationConfigurator } from "@/core/adapters/kintone/notificationConfigurator";
import { createLocalFileAppRevisionStorage } from "@/core/adapters/local/appRevisionStorage";
import { createLocalFileNotificationStateStorage } from "@/core/adapters/local/notificationStateStorage";
import { createLocalFileNotificationStorage } from "@/core/adapters/local/notificationStorage";
import { configCodec } from "@/core/adapters/yaml/configCodec";
import type { KintoneAuth } from "@/core/application/container/cli";
import type { NotificationContainer } from "@/core/application/container/notification";
import { createKintoneClient } from "./kintoneClient";

export type NotificationCliContainerConfig = {
  baseUrl: string;
  auth: KintoneAuth;
  appId: string;
  guestSpaceId?: string;
  notificationFilePath: string;
  notificationStateFilePath: string;
  appRevisionFilePath: string;
  client?: KintoneRestAPIClient;
};

export function createNotificationCliContainer(
  config: NotificationCliContainerConfig,
): NotificationContainer {
  const client = config.client ?? createKintoneClient(config);

  return {
    configCodec,
    notificationConfigurator: new KintoneNotificationConfigurator(
      client,
      config.appId,
    ),
    notificationStorage: createLocalFileNotificationStorage(
      config.notificationFilePath,
    ),
    notificationStateStorage: createLocalFileNotificationStateStorage(
      config.notificationStateFilePath,
    ),
    appRevisionStorage: createLocalFileAppRevisionStorage(
      config.appRevisionFilePath,
    ),
    appRevisionReader: new KintoneAppRevisionReader(client, config.appId),
    appDeployer: new KintoneAppDeployer(client, config.appId),
  };
}
