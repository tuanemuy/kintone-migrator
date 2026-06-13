import type { KintoneRestAPIClient } from "@kintone/rest-api-client";
import { KintoneAppDeployer } from "@/core/adapters/kintone/appDeployer";
import { KintoneAppRevisionReader } from "@/core/adapters/kintone/appRevisionReader";
import { KintoneGeneralSettingsConfigurator } from "@/core/adapters/kintone/generalSettingsConfigurator";
import { createLocalFileAppRevisionStorage } from "@/core/adapters/local/appRevisionStorage";
import { createLocalFileGeneralSettingsStateStorage } from "@/core/adapters/local/generalSettingsStateStorage";
import { createLocalFileGeneralSettingsStorage } from "@/core/adapters/local/generalSettingsStorage";
import { configCodec } from "@/core/adapters/yaml/configCodec";
import type { KintoneAuth } from "./cli";
import type { GeneralSettingsContainer } from "./generalSettings";
import { createKintoneClient } from "./kintoneClient";

export type GeneralSettingsCliContainerConfig = {
  baseUrl: string;
  auth: KintoneAuth;
  appId: string;
  guestSpaceId?: string;
  settingsFilePath: string;
  settingsStateFilePath: string;
  appRevisionFilePath: string;
  client?: KintoneRestAPIClient;
};

export function createGeneralSettingsCliContainer(
  config: GeneralSettingsCliContainerConfig,
): GeneralSettingsContainer {
  const client = config.client ?? createKintoneClient(config);

  return {
    configCodec,
    generalSettingsConfigurator: new KintoneGeneralSettingsConfigurator(
      client,
      config.appId,
    ),
    generalSettingsStorage: createLocalFileGeneralSettingsStorage(
      config.settingsFilePath,
    ),
    generalSettingsStateStorage: createLocalFileGeneralSettingsStateStorage(
      config.settingsStateFilePath,
    ),
    appRevisionStorage: createLocalFileAppRevisionStorage(
      config.appRevisionFilePath,
    ),
    appRevisionReader: new KintoneAppRevisionReader(client, config.appId),
    appDeployer: new KintoneAppDeployer(client, config.appId),
  };
}
