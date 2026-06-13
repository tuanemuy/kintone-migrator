import type { GeneralSettingsCliContainerConfig } from "@/core/application/container/generalSettingsCli";
import {
  buildAppRevisionFilePath,
  buildDomainStateFilePath,
  buildLegacyAppRevisionFilePath,
  buildLegacyDomainStateFilePath,
} from "@/core/domain/projectConfig/appFilePaths";
import { kintoneArgs, multiAppArgs } from "./config";
import { createDomainConfigResolver } from "./createDomainConfigResolver";
import type { MultiAppCliValues } from "./projectConfig";

const SETTINGS_STATE_FILE = "settings.yaml";

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

const {
  resolveFilePath: resolveSettingsFilePath,
  resolveContainerConfig: resolveSettingsContainerConfig,
  resolveAppContainerConfig: resolveSettingsAppContainerConfig,
} = createDomainConfigResolver({
  fileArgKey: "settings-file",
  envVar: () => process.env.SETTINGS_FILE_PATH,
  appFileField: (a) => a.settingsFile,
  defaultDir: "settings",
  defaultFileName: "settings.yaml",
  buildConfig: (base, filePath, app): GeneralSettingsCliContainerConfig => ({
    ...base,
    settingsFilePath: filePath,
    // State (base snapshot) and the app-scoped revision live under
    // state/<appName>/ for project apps, or state/ for legacy single-app mode
    // (ADR-188-001).
    settingsStateFilePath: app
      ? buildDomainStateFilePath(app.name, SETTINGS_STATE_FILE)
      : buildLegacyDomainStateFilePath(SETTINGS_STATE_FILE),
    appRevisionFilePath: app
      ? buildAppRevisionFilePath(app.name)
      : buildLegacyAppRevisionFilePath(),
  }),
});

export {
  resolveSettingsFilePath,
  resolveSettingsContainerConfig,
  resolveSettingsAppContainerConfig,
};
