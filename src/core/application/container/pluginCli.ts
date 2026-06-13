import type { KintoneRestAPIClient } from "@kintone/rest-api-client";
import { KintoneAppDeployer } from "@/core/adapters/kintone/appDeployer";
import { KintoneAppRevisionReader } from "@/core/adapters/kintone/appRevisionReader";
import { KintonePluginConfigurator } from "@/core/adapters/kintone/pluginConfigurator";
import { createLocalFileAppRevisionStorage } from "@/core/adapters/local/appRevisionStorage";
import { createLocalFilePluginStateStorage } from "@/core/adapters/local/pluginStateStorage";
import { createLocalFilePluginStorage } from "@/core/adapters/local/pluginStorage";
import { configCodec } from "@/core/adapters/yaml/configCodec";
import type { KintoneAuth } from "./cli";
import { createKintoneClient } from "./kintoneClient";
import type { PluginContainer } from "./plugin";

export type PluginCliContainerConfig = {
  baseUrl: string;
  auth: KintoneAuth;
  appId: string;
  guestSpaceId?: string;
  pluginFilePath: string;
  pluginStateFilePath: string;
  appRevisionFilePath: string;
  client?: KintoneRestAPIClient;
};

export function createPluginCliContainer(
  config: PluginCliContainerConfig,
): PluginContainer {
  const client = config.client ?? createKintoneClient(config);

  return {
    configCodec,
    pluginConfigurator: new KintonePluginConfigurator(client, config.appId),
    pluginStorage: createLocalFilePluginStorage(config.pluginFilePath),
    pluginStateStorage: createLocalFilePluginStateStorage(
      config.pluginStateFilePath,
    ),
    appRevisionStorage: createLocalFileAppRevisionStorage(
      config.appRevisionFilePath,
    ),
    appRevisionReader: new KintoneAppRevisionReader(client, config.appId),
    appDeployer: new KintoneAppDeployer(client, config.appId),
  };
}
