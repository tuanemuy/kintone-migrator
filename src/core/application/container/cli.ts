import { KintoneRestAPIClient } from "@kintone/rest-api-client";
import type { CliConfig } from "@/cli/config";
import { buildKintoneAuth } from "@/cli/config";
import { KintoneAppDeployer } from "@/core/adapters/kintone/appDeployer";
import { KintoneFormConfigurator } from "@/core/adapters/kintone/formConfigurator";
import { KintoneRecordManager } from "@/core/adapters/kintone/recordManager";
import { LocalFileSchemaStorage } from "@/core/adapters/local/schemaStorage";
import { LocalFileSeedStorage } from "@/core/adapters/local/seedStorage";
import type { Container } from "@/core/application/container";
import type { SeedContainer } from "@/core/application/container/seed";

export type CliContainerConfig = {
  baseUrl: string;
  auth: CliConfig["auth"];
  appId: string;
  guestSpaceId?: string;
  schemaFilePath: string;
};

export type SeedCliContainerConfig = {
  baseUrl: string;
  auth: CliConfig["auth"];
  appId: string;
  guestSpaceId?: string;
  seedFilePath: string;
};

export function createCliContainer(config: CliContainerConfig): Container {
  const client = new KintoneRestAPIClient({
    baseUrl: config.baseUrl,
    auth: buildKintoneAuth(config.auth),
    guestSpaceId: config.guestSpaceId,
  });

  return {
    formConfigurator: new KintoneFormConfigurator(client, config.appId),
    schemaStorage: new LocalFileSchemaStorage(config.schemaFilePath),
    appDeployer: new KintoneAppDeployer(client, config.appId),
  };
}

export function createSeedCliContainer(
  config: SeedCliContainerConfig,
): SeedContainer {
  const client = new KintoneRestAPIClient({
    baseUrl: config.baseUrl,
    auth: buildKintoneAuth(config.auth),
    guestSpaceId: config.guestSpaceId,
  });

  return {
    recordManager: new KintoneRecordManager(client, config.appId),
    seedStorage: new LocalFileSeedStorage(config.seedFilePath),
  };
}
