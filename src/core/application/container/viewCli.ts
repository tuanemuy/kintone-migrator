import { KintoneRestAPIClient } from "@kintone/rest-api-client";
import { KintoneAppDeployer } from "@/core/adapters/kintone/appDeployer";
import { KintoneViewConfigurator } from "@/core/adapters/kintone/viewConfigurator";
import { LocalFileViewStorage } from "@/core/adapters/local/viewStorage";
import type { ViewContainer } from "@/core/application/container/view";
import { buildKintoneAuth, type KintoneAuth } from "./cli";

export type ViewCliContainerConfig = {
  baseUrl: string;
  auth: KintoneAuth;
  appId: string;
  guestSpaceId?: string;
  viewFilePath: string;
};

export function createViewCliContainer(
  config: ViewCliContainerConfig,
): ViewContainer {
  const client = new KintoneRestAPIClient({
    baseUrl: config.baseUrl,
    auth: buildKintoneAuth(config.auth),
    guestSpaceId: config.guestSpaceId,
  });

  return {
    viewConfigurator: new KintoneViewConfigurator(client, config.appId),
    viewStorage: new LocalFileViewStorage(config.viewFilePath),
    appDeployer: new KintoneAppDeployer(client, config.appId),
  };
}
