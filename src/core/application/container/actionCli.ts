import type { KintoneRestAPIClient } from "@kintone/rest-api-client";
import { KintoneActionConfigurator } from "@/core/adapters/kintone/actionConfigurator";
import { KintoneAppDeployer } from "@/core/adapters/kintone/appDeployer";
import { KintoneAppRevisionReader } from "@/core/adapters/kintone/appRevisionReader";
import { createLocalFileActionStateStorage } from "@/core/adapters/local/actionStateStorage";
import { createLocalFileActionStorage } from "@/core/adapters/local/actionStorage";
import { createLocalFileAppRevisionStorage } from "@/core/adapters/local/appRevisionStorage";
import { configCodec } from "@/core/adapters/yaml/configCodec";
import type { ActionContainer } from "@/core/application/container/action";
import type { KintoneAuth } from "@/core/application/container/cli";
import { createKintoneClient } from "./kintoneClient";

export type ActionCliContainerConfig = {
  baseUrl: string;
  auth: KintoneAuth;
  appId: string;
  guestSpaceId?: string;
  actionFilePath: string;
  actionStateFilePath: string;
  appRevisionFilePath: string;
  client?: KintoneRestAPIClient;
};

export function createActionCliContainer(
  config: ActionCliContainerConfig,
): ActionContainer {
  const client = config.client ?? createKintoneClient(config);

  return {
    configCodec,
    actionConfigurator: new KintoneActionConfigurator(client, config.appId),
    actionStorage: createLocalFileActionStorage(config.actionFilePath),
    actionStateStorage: createLocalFileActionStateStorage(
      config.actionStateFilePath,
    ),
    appRevisionStorage: createLocalFileAppRevisionStorage(
      config.appRevisionFilePath,
    ),
    appRevisionReader: new KintoneAppRevisionReader(client, config.appId),
    appDeployer: new KintoneAppDeployer(client, config.appId),
  };
}
