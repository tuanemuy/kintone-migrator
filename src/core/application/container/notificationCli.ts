import { KintoneRestAPIClient } from "@kintone/rest-api-client";
import { KintoneAppDeployer } from "@/core/adapters/kintone/appDeployer";
import { KintoneNotificationConfigurator } from "@/core/adapters/kintone/notificationConfigurator";
import { createLocalFileNotificationStorage } from "@/core/adapters/local/notificationStorage";
import {
  buildKintoneAuth,
  type KintoneAuth,
} from "@/core/application/container/cli";
import type { NotificationContainer } from "@/core/application/container/notification";

export type NotificationCliContainerConfig = {
  baseUrl: string;
  auth: KintoneAuth;
  appId: string;
  guestSpaceId?: string;
  notificationFilePath: string;
};

export function createNotificationCliContainer(
  config: NotificationCliContainerConfig,
): NotificationContainer {
  const client = new KintoneRestAPIClient({
    baseUrl: config.baseUrl,
    auth: buildKintoneAuth(config.auth),
    guestSpaceId: config.guestSpaceId,
  });

  return {
    notificationConfigurator: new KintoneNotificationConfigurator(
      client,
      config.appId,
    ),
    notificationStorage: createLocalFileNotificationStorage(
      config.notificationFilePath,
    ),
    appDeployer: new KintoneAppDeployer(client, config.appId),
  };
}
