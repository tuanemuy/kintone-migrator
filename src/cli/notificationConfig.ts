import { kintoneArgs, multiAppArgs } from "./config";
import { createDomainConfigResolver } from "./createDomainConfigResolver";
import type { MultiAppCliValues } from "./projectConfig";

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

const {
  resolveFilePath: resolveNotificationFilePath,
  resolveContainerConfig: resolveNotificationContainerConfig,
  resolveAppContainerConfig: resolveNotificationAppContainerConfig,
} = createDomainConfigResolver<
  "notification-file",
  "notificationFilePath",
  NotificationCliValues
>({
  fileArgKey: "notification-file",
  envVar: () => process.env.NOTIFICATION_FILE_PATH,
  appFileField: (a) => a.notificationFile,
  defaultDir: "notification",
  defaultFileName: "notification.yaml",
  filePathKey: "notificationFilePath",
});

export {
  resolveNotificationFilePath,
  resolveNotificationContainerConfig,
  resolveNotificationAppContainerConfig,
};
