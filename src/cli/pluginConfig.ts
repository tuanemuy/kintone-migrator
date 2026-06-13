import type { PluginCliContainerConfig } from "@/core/application/container/pluginCli";
import {
  buildAppRevisionFilePath,
  buildDomainStateFilePath,
  buildLegacyAppRevisionFilePath,
  buildLegacyDomainStateFilePath,
} from "@/core/domain/projectConfig/appFilePaths";
import { kintoneArgs, multiAppArgs } from "./config";
import { createDomainConfigResolver } from "./createDomainConfigResolver";
import type { MultiAppCliValues } from "./projectConfig";

const PLUGIN_STATE_FILE = "plugin.yaml";

export const pluginArgs = {
  ...kintoneArgs,
  ...multiAppArgs,
  "plugin-file": {
    type: "string" as const,
    description: "Plugin file path (default: plugins.yaml)",
  },
};

export type PluginCliValues = MultiAppCliValues & {
  "plugin-file"?: string;
};

const {
  resolveFilePath: resolvePluginFilePath,
  resolveContainerConfig: resolvePluginContainerConfig,
  resolveAppContainerConfig: resolvePluginAppContainerConfig,
} = createDomainConfigResolver({
  fileArgKey: "plugin-file",
  envVar: () => process.env.PLUGIN_FILE_PATH,
  appFileField: (a) => a.pluginFile,
  defaultDir: "plugin",
  defaultFileName: "plugins.yaml",
  buildConfig: (base, filePath, app): PluginCliContainerConfig => ({
    ...base,
    pluginFilePath: filePath,
    // State (base snapshot) and the app-scoped revision live under
    // state/<appName>/ for project apps, or state/ for legacy single-app mode.
    pluginStateFilePath: app
      ? buildDomainStateFilePath(app.name, PLUGIN_STATE_FILE)
      : buildLegacyDomainStateFilePath(PLUGIN_STATE_FILE),
    appRevisionFilePath: app
      ? buildAppRevisionFilePath(app.name)
      : buildLegacyAppRevisionFilePath(),
  }),
});

export {
  resolvePluginFilePath,
  resolvePluginContainerConfig,
  resolvePluginAppContainerConfig,
};
