import type { GeneralSettingsCliContainerConfig } from "@/core/application/container/generalSettingsCli";
import type {
  AppEntry,
  ProjectConfig,
} from "@/core/domain/projectConfig/entity";
import { kintoneArgs, multiAppArgs, resolveConfig } from "./config";
import { type MultiAppCliValues, resolveAppCliConfig } from "./projectConfig";
import { resolveFilePath } from "./resolveFilePath";

export const settingsArgs = {
  ...kintoneArgs,
  ...multiAppArgs,
  "settings-file": {
    type: "string" as const,
    description: "General settings file path (default: settings.yaml)",
  },
};

export type SettingsCliValues = MultiAppCliValues & {
  "settings-file"?: string;
};

export function resolveSettingsFilePath(
  cliValues: SettingsCliValues,
  app?: AppEntry,
): string {
  return resolveFilePath({
    cliValue: cliValues["settings-file"],
    envVar: process.env.SETTINGS_FILE_PATH,
    appFileField: (a) => a.settingsFile,
    app,
    defaultDir: "settings",
    defaultFileName: "settings.yaml",
  });
}

export function resolveSettingsContainerConfig(
  cliValues: SettingsCliValues,
): GeneralSettingsCliContainerConfig {
  const config = resolveConfig(cliValues);
  return {
    baseUrl: config.baseUrl,
    auth: config.auth,
    appId: config.appId,
    guestSpaceId: config.guestSpaceId,
    settingsFilePath: resolveSettingsFilePath(cliValues),
  };
}

export function resolveSettingsAppContainerConfig(
  app: AppEntry,
  projectConfig: ProjectConfig,
  cliValues: SettingsCliValues,
): GeneralSettingsCliContainerConfig {
  const config = resolveAppCliConfig(app, projectConfig, cliValues);
  return {
    baseUrl: config.baseUrl,
    auth: config.auth,
    appId: config.appId,
    guestSpaceId: config.guestSpaceId,
    settingsFilePath: resolveSettingsFilePath(cliValues, app),
  };
}
