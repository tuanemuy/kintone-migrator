import { KintoneRestAPIClient } from "@kintone/rest-api-client";
import { KintoneAppDeployer } from "@/core/adapters/kintone/appDeployer";
import { KintonePluginConfigurator } from "@/core/adapters/kintone/pluginConfigurator";
import { LocalFilePluginStorage } from "@/core/adapters/local/pluginStorage";
import { buildKintoneAuth, type KintoneAuth } from "./cli";
import type { PluginContainer } from "./plugin";

export type PluginCliContainerConfig = {
  baseUrl: string;
  auth: KintoneAuth;
  appId: string;
  guestSpaceId?: string;
  pluginFilePath: string;
};

export function createPluginCliContainer(
  config: PluginCliContainerConfig,
): PluginContainer {
  const client = new KintoneRestAPIClient({
    baseUrl: config.baseUrl,
    auth: buildKintoneAuth(config.auth),
    guestSpaceId: config.guestSpaceId,
  });

  return {
    pluginConfigurator: new KintonePluginConfigurator(client, config.appId),
    pluginStorage: new LocalFilePluginStorage(config.pluginFilePath),
    appDeployer: new KintoneAppDeployer(client, config.appId),
  };
}
