import { KintoneRestAPIClient } from "@kintone/rest-api-client";
import { KintoneAppDeployer } from "@/core/adapters/kintone/appDeployer";
import { KintoneFormConfigurator } from "@/core/adapters/kintone/formConfigurator";
import { LocalFileSchemaStorage } from "@/core/adapters/local/schemaStorage";
import type { Container } from "@/core/application/container";

export type CliContainerConfig = {
  baseUrl: string;
  username: string;
  password: string;
  appId: string;
  schemaFilePath: string;
};

export function createCliContainer(config: CliContainerConfig): Container {
  const client = new KintoneRestAPIClient({
    baseUrl: config.baseUrl,
    auth: {
      username: config.username,
      password: config.password,
    },
  });

  return {
    formConfigurator: new KintoneFormConfigurator(client, config.appId),
    schemaStorage: new LocalFileSchemaStorage(config.schemaFilePath),
    appDeployer: new KintoneAppDeployer(client, config.appId),
  };
}
