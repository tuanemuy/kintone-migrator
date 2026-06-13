import type { KintoneRestAPIClient } from "@kintone/rest-api-client";
import { KintoneAppDeployer } from "@/core/adapters/kintone/appDeployer";
import { KintoneAppRevisionReader } from "@/core/adapters/kintone/appRevisionReader";
import { KintoneCustomizationConfigurator } from "@/core/adapters/kintone/customizationConfigurator";
import { KintoneFileDownloader } from "@/core/adapters/kintone/fileDownloader";
import { KintoneFileUploader } from "@/core/adapters/kintone/fileUploader";
import { KintoneFormConfigurator } from "@/core/adapters/kintone/formConfigurator";
import { KintoneRecordManager } from "@/core/adapters/kintone/recordManager";
import { createLocalFileAppRevisionStorage } from "@/core/adapters/local/appRevisionStorage";
import { createLocalFileCustomizationStateStorage } from "@/core/adapters/local/customizationStateStorage";
import { createLocalFileCustomizationStorage } from "@/core/adapters/local/customizationStorage";
import { LocalFileContentReader } from "@/core/adapters/local/fileContentReader";
import { LocalFileWriter } from "@/core/adapters/local/fileWriter";
import { createLocalFileSchemaStateStorage } from "@/core/adapters/local/schemaStateStorage";
import { createLocalFileSchemaStorage } from "@/core/adapters/local/schemaStorage";
import { createLocalFileSeedStorage } from "@/core/adapters/local/seedStorage";
import { configCodec } from "@/core/adapters/yaml/configCodec";
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
  stateSchemaFilePath: string;
  appRevisionFilePath: string;
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
    configCodec,
    formConfigurator: new KintoneFormConfigurator(client, config.appId),
    schemaStorage: createLocalFileSchemaStorage(config.schemaFilePath),
    schemaStateStorage: createLocalFileSchemaStateStorage(
      config.stateSchemaFilePath,
    ),
    appRevisionStorage: createLocalFileAppRevisionStorage(
      config.appRevisionFilePath,
    ),
    appDeployer: new KintoneAppDeployer(client, config.appId),
  };
}

export function createSeedCliContainer(
  config: SeedCliContainerConfig,
): SeedContainer {
  const client = config.client ?? createKintoneClient(config);

  return {
    configCodec,
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
  // Optional so capture/apply/diff callers need not supply 3-way paths; pull/push
  // resolve them via customizeConfig (ADR-188-001).
  customizeStateFilePath?: string;
  appRevisionFilePath?: string;
  client?: KintoneRestAPIClient;
};

export function createCustomizationCliContainer(
  config: CustomizationCliContainerConfig,
): CustomizationContainer {
  const client = config.client ?? createKintoneClient(config);

  return {
    configCodec,
    customizationConfigurator: new KintoneCustomizationConfigurator(
      client,
      config.appId,
    ),
    customizationStorage: createLocalFileCustomizationStorage(
      config.customizeFilePath,
    ),
    customizationStateStorage: createLocalFileCustomizationStateStorage(
      config.customizeStateFilePath ?? `${config.customizeFilePath}.state`,
    ),
    appRevisionStorage: createLocalFileAppRevisionStorage(
      config.appRevisionFilePath ?? `${config.customizeFilePath}.revision`,
    ),
    appRevisionReader: new KintoneAppRevisionReader(client, config.appId),
    fileUploader: new KintoneFileUploader(client, process.cwd()),
    fileDownloader: new KintoneFileDownloader(client),
    fileContentReader: new LocalFileContentReader(),
    fileWriter: new LocalFileWriter(process.cwd()),
    appDeployer: new KintoneAppDeployer(client, config.appId),
  };
}
