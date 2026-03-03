import type { KintoneRestAPIClient } from "@kintone/rest-api-client";
import { KintoneAppDeployer } from "@/core/adapters/kintone/appDeployer";
import { KintoneViewConfigurator } from "@/core/adapters/kintone/viewConfigurator";
import { createLocalFileViewStorage } from "@/core/adapters/local/viewStorage";
import type { ViewContainer } from "@/core/application/container/view";
import type { KintoneAuth } from "./cli";
import { createKintoneClient } from "./kintoneClient";

export type ViewCliContainerConfig = {
  baseUrl: string;
  auth: KintoneAuth;
  appId: string;
  guestSpaceId?: string;
  viewFilePath: string;
  client?: KintoneRestAPIClient;
};

export function createViewCliContainer(
  config: ViewCliContainerConfig,
): ViewContainer {
  const client = config.client ?? createKintoneClient(config);

  return {
    viewConfigurator: new KintoneViewConfigurator(client, config.appId),
    viewStorage: createLocalFileViewStorage(config.viewFilePath),
    appDeployer: new KintoneAppDeployer(client, config.appId),
  };
}
