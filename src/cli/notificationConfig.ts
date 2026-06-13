import type { NotificationCliContainerConfig } from "@/core/application/container/notificationCli";
import {
  buildAppRevisionFilePath,
  buildDomainStateFilePath,
  buildLegacyAppRevisionFilePath,
  buildLegacyDomainStateFilePath,
} from "@/core/domain/projectConfig/appFilePaths";
import { kintoneArgs, multiAppArgs } from "./config";
import { createDomainConfigResolver } from "./createDomainConfigResolver";
import type { MultiAppCliValues } from "./projectConfig";

const NOTIFICATION_STATE_FILE = "notification.yaml";

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
} = createDomainConfigResolver({
  fileArgKey: "notification-file",
  envVar: () => process.env.NOTIFICATION_FILE_PATH,
  appFileField: (a) => a.notificationFile,
  defaultDir: "notification",
  defaultFileName: "notification.yaml",
  buildConfig: (base, filePath, app): NotificationCliContainerConfig => ({
    ...base,
    notificationFilePath: filePath,
    // State (base snapshot) and the app-scoped revision live under
    // state/<appName>/ for project apps, or state/ for legacy single-app mode.
    notificationStateFilePath: app
      ? buildDomainStateFilePath(app.name, NOTIFICATION_STATE_FILE)
      : buildLegacyDomainStateFilePath(NOTIFICATION_STATE_FILE),
    appRevisionFilePath: app
      ? buildAppRevisionFilePath(app.name)
      : buildLegacyAppRevisionFilePath(),
  }),
});

export {
  resolveNotificationFilePath,
  resolveNotificationContainerConfig,
  resolveNotificationAppContainerConfig,
};
