import type { KintoneRestAPIClient } from "@kintone/rest-api-client";
import { KintoneAppLister } from "@/core/adapters/kintone/appLister";
import { KintoneSpaceReader } from "@/core/adapters/kintone/spaceReader";
import { createLocalFileProjectConfigStorage } from "@/core/adapters/local/projectConfigStorage";
import type { KintoneAuth } from "./cli";
import type { InitContainer } from "./init";
import { createKintoneClient } from "./kintoneClient";

export type InitCliContainerConfig = {
  baseUrl: string;
  auth: KintoneAuth;
  guestSpaceId?: string;
  configFilePath: string;
  client?: KintoneRestAPIClient;
};

export function createInitCliContainer(
  config: InitCliContainerConfig,
): InitContainer {
  const client = config.client ?? createKintoneClient(config);

  return {
    spaceReader: new KintoneSpaceReader(client),
    appLister: new KintoneAppLister(client),
    projectConfigStorage: createLocalFileProjectConfigStorage(
      config.configFilePath,
    ),
  };
}
