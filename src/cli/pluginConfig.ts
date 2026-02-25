import { kintoneArgs, multiAppArgs } from "./config";
import { createDomainConfigResolver } from "./createDomainConfigResolver";
import type { MultiAppCliValues } from "./projectConfig";

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
} = createDomainConfigResolver<
  "plugin-file",
  "pluginFilePath",
  PluginCliValues
>({
  fileArgKey: "plugin-file",
  envVar: () => process.env.PLUGIN_FILE_PATH,
  appFileField: (a) => a.pluginFile,
  defaultDir: "plugin",
  defaultFileName: "plugins.yaml",
  filePathKey: "pluginFilePath",
});

export {
  resolvePluginFilePath,
  resolvePluginContainerConfig,
  resolvePluginAppContainerConfig,
};
