import type { NotificationCliContainerConfig } from "@/core/application/container/notification";
import type {
  AppEntry,
  ProjectConfig,
} from "@/core/domain/projectConfig/entity";
import { kintoneArgs, multiAppArgs, resolveConfig } from "./config";
import { type MultiAppCliValues, resolveAppCliConfig } from "./projectConfig";

export const notificationArgs = {
  ...kintoneArgs,
  ...multiAppArgs,
  "notification-file": {
    type: "string" as const,
    description: "Notification file path (default: notification.yaml)",
  },
};

export type NotificationCliValues = MultiAppCliValues & {
  "notification-file"?: string;
};

export function resolveNotificationFilePath(
  cliValues: NotificationCliValues,
  app?: AppEntry,
): string {
  return (
    cliValues["notification-file"] ??
    process.env.NOTIFICATION_FILE_PATH ??
    (app ? `notification/${app.name}.yaml` : "notification.yaml")
  );
}

export function resolveNotificationContainerConfig(
  cliValues: NotificationCliValues,
): NotificationCliContainerConfig {
  const config = resolveConfig(cliValues);
  return {
    baseUrl: config.baseUrl,
    auth: config.auth,
    appId: config.appId,
    guestSpaceId: config.guestSpaceId,
    notificationFilePath: resolveNotificationFilePath(cliValues),
  };
}

export function resolveNotificationAppContainerConfig(
  app: AppEntry,
  projectConfig: ProjectConfig,
  cliValues: NotificationCliValues,
): NotificationCliContainerConfig {
  const config = resolveAppCliConfig(app, projectConfig, cliValues);
  return {
    baseUrl: config.baseUrl,
    auth: config.auth,
    appId: config.appId,
    guestSpaceId: config.guestSpaceId,
    notificationFilePath: resolveNotificationFilePath(cliValues, app),
  };
}
