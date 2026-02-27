import { KintoneRestAPIClient } from "@kintone/rest-api-client";
import { KintoneAppDeployer } from "@/core/adapters/kintone/appDeployer";
import { KintoneGeneralSettingsConfigurator } from "@/core/adapters/kintone/generalSettingsConfigurator";
import { createLocalFileGeneralSettingsStorage } from "@/core/adapters/local/generalSettingsStorage";
import { buildKintoneAuth, type KintoneAuth } from "./cli";
import type { GeneralSettingsContainer } from "./generalSettings";

export type GeneralSettingsCliContainerConfig = {
  baseUrl: string;
  auth: KintoneAuth;
  appId: string;
  guestSpaceId?: string;
  settingsFilePath: string;
};

export function createGeneralSettingsCliContainer(
  config: GeneralSettingsCliContainerConfig,
): GeneralSettingsContainer {
  const client = new KintoneRestAPIClient({
    baseUrl: config.baseUrl,
    auth: buildKintoneAuth(config.auth),
    guestSpaceId: config.guestSpaceId,
  });

  return {
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
