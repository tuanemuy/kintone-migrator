import type { PluginCliContainerConfig } from "@/core/application/container/pluginCli";
import type {
  AppEntry,
  ProjectConfig,
} from "@/core/domain/projectConfig/entity";
import { kintoneArgs, multiAppArgs, resolveConfig } from "./config";
import { type MultiAppCliValues, resolveAppCliConfig } from "./projectConfig";
import { resolveFilePath } from "./resolveFilePath";

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

export function resolvePluginFilePath(
  cliValues: PluginCliValues,
  app?: AppEntry,
): string {
  return resolveFilePath({
    cliValue: cliValues["plugin-file"],
    envVar: process.env.PLUGIN_FILE_PATH,
    appFileField: (a) => a.pluginFile,
    app,
    defaultDir: "plugin",
    defaultFileName: "plugins.yaml",
  });
}

export function resolvePluginContainerConfig(
  cliValues: PluginCliValues,
): PluginCliContainerConfig {
  const config = resolveConfig(cliValues);
  return {
    baseUrl: config.baseUrl,
    auth: config.auth,
    appId: config.appId,
    guestSpaceId: config.guestSpaceId,
    pluginFilePath: resolvePluginFilePath(cliValues),
  };
}

export function resolvePluginAppContainerConfig(
  app: AppEntry,
  projectConfig: ProjectConfig,
  cliValues: PluginCliValues,
): PluginCliContainerConfig {
  const config = resolveAppCliConfig(app, projectConfig, cliValues);
  return {
    baseUrl: config.baseUrl,
    auth: config.auth,
    appId: config.appId,
    guestSpaceId: config.guestSpaceId,
    pluginFilePath: resolvePluginFilePath(cliValues, app),
  };
}
