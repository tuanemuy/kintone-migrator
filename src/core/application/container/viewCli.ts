import type { KintoneRestAPIClient } from "@kintone/rest-api-client";
import { KintoneAppDeployer } from "@/core/adapters/kintone/appDeployer";
import { KintoneAppRevisionReader } from "@/core/adapters/kintone/appRevisionReader";
import { KintoneViewConfigurator } from "@/core/adapters/kintone/viewConfigurator";
import { createLocalFileAppRevisionStorage } from "@/core/adapters/local/appRevisionStorage";
import { createLocalFileViewStateStorage } from "@/core/adapters/local/viewStateStorage";
import { createLocalFileViewStorage } from "@/core/adapters/local/viewStorage";
import { configCodec } from "@/core/adapters/yaml/configCodec";
import type { ViewContainer } from "@/core/application/container/view";
import type { KintoneAuth } from "./cli";
import { createKintoneClient } from "./kintoneClient";

export type ViewCliContainerConfig = {
  baseUrl: string;
  auth: KintoneAuth;
  appId: string;
  guestSpaceId?: string;
  viewFilePath: string;
  viewStateFilePath: string;
  appRevisionFilePath: string;
  client?: KintoneRestAPIClient;
};

export function createViewCliContainer(
  config: ViewCliContainerConfig,
): ViewContainer {
  const client = config.client ?? createKintoneClient(config);

  return {
    configCodec,
    viewConfigurator: new KintoneViewConfigurator(client, config.appId),
    viewStorage: createLocalFileViewStorage(config.viewFilePath),
    viewStateStorage: createLocalFileViewStateStorage(config.viewStateFilePath),
    appRevisionStorage: createLocalFileAppRevisionStorage(
      config.appRevisionFilePath,
    ),
    appRevisionReader: new KintoneAppRevisionReader(client, config.appId),
    appDeployer: new KintoneAppDeployer(client, config.appId),
  };
}
