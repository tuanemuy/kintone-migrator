import type { KintoneRestAPIClient } from "@kintone/rest-api-client";
import { KintoneAppDeployer } from "@/core/adapters/kintone/appDeployer";
import { KintoneCustomizationConfigurator } from "@/core/adapters/kintone/customizationConfigurator";
import { KintoneFileDownloader } from "@/core/adapters/kintone/fileDownloader";
import { KintoneFileUploader } from "@/core/adapters/kintone/fileUploader";
import { KintoneFormConfigurator } from "@/core/adapters/kintone/formConfigurator";
import { KintoneRecordManager } from "@/core/adapters/kintone/recordManager";
import { createLocalFileCustomizationStorage } from "@/core/adapters/local/customizationStorage";
import { LocalFileWriter } from "@/core/adapters/local/fileWriter";
import { createLocalFileSchemaStorage } from "@/core/adapters/local/schemaStorage";
import { createLocalFileSeedStorage } from "@/core/adapters/local/seedStorage";
import type { CustomizationContainer } from "@/core/application/container/customization";
import type { FormSchemaContainer } from "@/core/application/container/formSchema";
import type { SeedContainer } from "@/core/application/container/seed";
import { createKintoneClient } from "./kintoneClient";

export type KintoneAuth =
  | { type: "apiToken"; apiToken: string | string[] }
  | { type: "password"; username: string; password: string };

export function buildKintoneAuth(auth: KintoneAuth):
  | {
      apiToken: string | string[];
    }
  | {
      username: string;
      password: string;
    } {
  if (auth.type === "apiToken") {
    return { apiToken: auth.apiToken };
  }
  return { username: auth.username, password: auth.password };
}

export type CliContainerConfig = {
  baseUrl: string;
  auth: KintoneAuth;
  appId: string;
  guestSpaceId?: string;
  schemaFilePath: string;
  client?: KintoneRestAPIClient;
};

export type SeedCliContainerConfig = {
  baseUrl: string;
  auth: KintoneAuth;
  appId: string;
  guestSpaceId?: string;
  seedFilePath: string;
  client?: KintoneRestAPIClient;
};

export function createCliContainer(
  config: CliContainerConfig,
): FormSchemaContainer {
  const client = config.client ?? createKintoneClient(config);

  return {
    formConfigurator: new KintoneFormConfigurator(client, config.appId),
    schemaStorage: createLocalFileSchemaStorage(config.schemaFilePath),
    appDeployer: new KintoneAppDeployer(client, config.appId),
  };
}

export function createSeedCliContainer(
  config: SeedCliContainerConfig,
): SeedContainer {
  const client = config.client ?? createKintoneClient(config);

  return {
    recordManager: new KintoneRecordManager(client, config.appId),
    seedStorage: createLocalFileSeedStorage(config.seedFilePath),
  };
}

export type CustomizationCliContainerConfig = {
  baseUrl: string;
  auth: KintoneAuth;
  appId: string;
  guestSpaceId?: string;
  customizeFilePath: string;
  client?: KintoneRestAPIClient;
};

export function createCustomizationCliContainer(
  config: CustomizationCliContainerConfig,
): CustomizationContainer {
  const client = config.client ?? createKintoneClient(config);

  return {
    customizationConfigurator: new KintoneCustomizationConfigurator(
      client,
      config.appId,
    ),
    customizationStorage: createLocalFileCustomizationStorage(
      config.customizeFilePath,
    ),
    fileUploader: new KintoneFileUploader(client),
    fileDownloader: new KintoneFileDownloader(client),
    fileWriter: new LocalFileWriter(),
    appDeployer: new KintoneAppDeployer(client, config.appId),
  };
}
