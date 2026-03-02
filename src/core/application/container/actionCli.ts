import type { KintoneRestAPIClient } from "@kintone/rest-api-client";
import { KintoneActionConfigurator } from "@/core/adapters/kintone/actionConfigurator";
import { KintoneAppDeployer } from "@/core/adapters/kintone/appDeployer";
import { createLocalFileActionStorage } from "@/core/adapters/local/actionStorage";
import type { ActionContainer } from "@/core/application/container/action";
import type { KintoneAuth } from "@/core/application/container/cli";
import { createKintoneClient } from "./kintoneClient";

export type ActionCliContainerConfig = {
  baseUrl: string;
  auth: KintoneAuth;
  appId: string;
  guestSpaceId?: string;
  actionFilePath: string;
  client?: KintoneRestAPIClient;
};

export function createActionCliContainer(
  config: ActionCliContainerConfig,
): ActionContainer {
  const client = config.client ?? createKintoneClient(config);

  return {
    actionConfigurator: new KintoneActionConfigurator(client, config.appId),
    actionStorage: createLocalFileActionStorage(config.actionFilePath),
    appDeployer: new KintoneAppDeployer(client, config.appId),
  };
}
