import type { KintoneRestAPIClient } from "@kintone/rest-api-client";
import { KintoneAppDeployer } from "@/core/adapters/kintone/appDeployer";
import { KintoneGeneralSettingsConfigurator } from "@/core/adapters/kintone/generalSettingsConfigurator";
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
    appDeployer: new KintoneAppDeployer(client, config.appId),
  };
}
