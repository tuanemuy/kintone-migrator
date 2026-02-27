import { KintoneRestAPIClient } from "@kintone/rest-api-client";
import { KintoneSpaceReader } from "@/core/adapters/kintone/spaceReader";
import { createLocalFileProjectConfigStorage } from "@/core/adapters/local/projectConfigStorage";
import { buildKintoneAuth, type KintoneAuth } from "./cli";
import type { InitContainer } from "./init";

export type InitCliContainerConfig = {
  baseUrl: string;
  auth: KintoneAuth;
  guestSpaceId?: string;
  configFilePath: string;
};

export function createInitCliContainer(
  config: InitCliContainerConfig,
): InitContainer {
  const client = new KintoneRestAPIClient({
    baseUrl: config.baseUrl,
    auth: buildKintoneAuth(config.auth),
    guestSpaceId: config.guestSpaceId,
  });

  return {
    spaceReader: new KintoneSpaceReader(client),
    projectConfigStorage: createLocalFileProjectConfigStorage(
      config.configFilePath,
    ),
  };
}
