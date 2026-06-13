import type { CustomizationCliContainerConfig } from "@/core/application/container/cli";
import {
  buildAppRevisionFilePath,
  buildDomainStateFilePath,
  buildLegacyAppRevisionFilePath,
  buildLegacyDomainStateFilePath,
} from "@/core/domain/projectConfig/appFilePaths";
import { kintoneArgs, multiAppArgs } from "./config";
import { createDomainConfigResolver } from "./createDomainConfigResolver";
import type { MultiAppCliValues } from "./projectConfig";

const CUSTOMIZE_STATE_FILE = "customize.yaml";

export const customizeArgs = {
  ...kintoneArgs,
  ...multiAppArgs,
  "customize-file": {
    type: "string" as const,
    description: "Customization config file path (default: customize.yaml)",
  },
};

export type CustomizeCliValues = MultiAppCliValues & {
  "customize-file"?: string;
};

const {
  resolveFilePath: resolveCustomizeFilePath,
  resolveContainerConfig: resolveCustomizeConfig,
  resolveAppContainerConfig: resolveCustomizeAppConfig,
} = createDomainConfigResolver({
  fileArgKey: "customize-file",
  envVar: () => process.env.CUSTOMIZE_FILE_PATH,
  appFileField: (a) => a.customizeFile,
  defaultDir: "customize",
  defaultFileName: "customize.yaml",
  buildConfig: (base, filePath, app): CustomizationCliContainerConfig => ({
    ...base,
    customizeFilePath: filePath,
    // State (base snapshot) and the app-scoped revision live under
    // state/<appName>/ for project apps, or state/ for legacy single-app mode.
    customizeStateFilePath: app
      ? buildDomainStateFilePath(app.name, CUSTOMIZE_STATE_FILE)
      : buildLegacyDomainStateFilePath(CUSTOMIZE_STATE_FILE),
    appRevisionFilePath: app
      ? buildAppRevisionFilePath(app.name)
      : buildLegacyAppRevisionFilePath(),
  }),
});

export {
  resolveCustomizeFilePath,
  resolveCustomizeConfig,
  resolveCustomizeAppConfig,
};
