import type { KintoneRestAPIClient } from "@kintone/rest-api-client";
import { KintoneAppRevisionGenerationsReader } from "@/core/adapters/kintone/appRevisionGenerationsReader";
import type { DeployStateContainer } from "@/core/application/container/deployState";
import type { KintoneAuth } from "./cli";
import { createKintoneClient } from "./kintoneClient";

export type DeployStateCliContainerConfig = {
  baseUrl: string;
  auth: KintoneAuth;
  appId: string;
  guestSpaceId?: string;
  client?: KintoneRestAPIClient;
};

export function createDeployStateCliContainer(
  config: DeployStateCliContainerConfig,
): DeployStateContainer {
  const client = config.client ?? createKintoneClient(config);

  return {
    appRevisionGenerationsReader: new KintoneAppRevisionGenerationsReader(
      client,
      config.appId,
    ),
  };
}
