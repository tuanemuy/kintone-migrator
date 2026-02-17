import { KintoneRestAPIClient } from "@kintone/rest-api-client";
import { KintoneAppDeployer } from "@/core/adapters/kintone/appDeployer";
import { KintoneNotificationConfigurator } from "@/core/adapters/kintone/notificationConfigurator";
import { LocalFileNotificationStorage } from "@/core/adapters/local/notificationStorage";
import type { NotificationConfigurator } from "@/core/domain/notification/ports/notificationConfigurator";
import type { NotificationStorage } from "@/core/domain/notification/ports/notificationStorage";
import type { AppDeployer } from "@/core/domain/ports/appDeployer";
import { buildKintoneAuth, type KintoneAuth } from "./cli";

export type NotificationContainer = {
  notificationConfigurator: NotificationConfigurator;
  notificationStorage: NotificationStorage;
  appDeployer: AppDeployer;
};

export type NotificationServiceArgs<T = undefined> = T extends undefined
  ? { container: NotificationContainer }
  : { container: NotificationContainer; input: T };

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
    notificationStorage: new LocalFileNotificationStorage(
      config.notificationFilePath,
    ),
    appDeployer: new KintoneAppDeployer(client, config.appId),
  };
}
