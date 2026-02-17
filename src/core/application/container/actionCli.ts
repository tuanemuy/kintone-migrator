import { KintoneRestAPIClient } from "@kintone/rest-api-client";
import { KintoneActionConfigurator } from "@/core/adapters/kintone/actionConfigurator";
import { KintoneAppDeployer } from "@/core/adapters/kintone/appDeployer";
import { LocalFileActionStorage } from "@/core/adapters/local/actionStorage";
import type { ActionContainer } from "@/core/application/container/action";
import {
  buildKintoneAuth,
  type KintoneAuth,
} from "@/core/application/container/cli";

export type ActionCliContainerConfig = {
  baseUrl: string;
  auth: KintoneAuth;
  appId: string;
  guestSpaceId?: string;
  actionFilePath: string;
};

export function createActionCliContainer(
  config: ActionCliContainerConfig,
): ActionContainer {
  const client = new KintoneRestAPIClient({
    baseUrl: config.baseUrl,
    auth: buildKintoneAuth(config.auth),
    guestSpaceId: config.guestSpaceId,
  });

  return {
    actionConfigurator: new KintoneActionConfigurator(client, config.appId),
    actionStorage: new LocalFileActionStorage(config.actionFilePath),
    appDeployer: new KintoneAppDeployer(client, config.appId),
  };
}
