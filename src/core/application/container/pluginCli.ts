import type { KintoneRestAPIClient } from "@kintone/rest-api-client";
import { KintoneAppDeployer } from "@/core/adapters/kintone/appDeployer";
import { KintonePluginConfigurator } from "@/core/adapters/kintone/pluginConfigurator";
import { createLocalFilePluginStorage } from "@/core/adapters/local/pluginStorage";
import type { KintoneAuth } from "./cli";
import { createKintoneClient } from "./kintoneClient";
import type { PluginContainer } from "./plugin";

export type PluginCliContainerConfig = {
  baseUrl: string;
  auth: KintoneAuth;
  appId: string;
  guestSpaceId?: string;
  pluginFilePath: string;
  client?: KintoneRestAPIClient;
};

export function createPluginCliContainer(
  config: PluginCliContainerConfig,
): PluginContainer {
  const client = config.client ?? createKintoneClient(config);

  return {
    pluginConfigurator: new KintonePluginConfigurator(client, config.appId),
    pluginStorage: createLocalFilePluginStorage(config.pluginFilePath),
    appDeployer: new KintoneAppDeployer(client, config.appId),
  };
}
