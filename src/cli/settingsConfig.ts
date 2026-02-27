import type { GeneralSettingsCliContainerConfig } from "@/core/application/container/generalSettingsCli";
import { kintoneArgs, multiAppArgs } from "./config";
import { createDomainConfigResolver } from "./createDomainConfigResolver";
import type { MultiAppCliValues } from "./projectConfig";

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
  buildConfig: (base, filePath): GeneralSettingsCliContainerConfig => ({
    ...base,
    settingsFilePath: filePath,
  }),
});

export {
  resolveSettingsFilePath,
  resolveSettingsContainerConfig,
  resolveSettingsAppContainerConfig,
};
