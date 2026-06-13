import type { KintoneRestAPIClient } from "@kintone/rest-api-client";
import { KintoneAdminNotesConfigurator } from "@/core/adapters/kintone/adminNotesConfigurator";
import { KintoneAppDeployer } from "@/core/adapters/kintone/appDeployer";
import { KintoneAppRevisionReader } from "@/core/adapters/kintone/appRevisionReader";
import { createLocalFileAdminNotesStateStorage } from "@/core/adapters/local/adminNotesStateStorage";
import { createLocalFileAdminNotesStorage } from "@/core/adapters/local/adminNotesStorage";
import { createLocalFileAppRevisionStorage } from "@/core/adapters/local/appRevisionStorage";
import { configCodec } from "@/core/adapters/yaml/configCodec";
import type { AdminNotesContainer } from "@/core/application/container/adminNotes";
import type { KintoneAuth } from "@/core/application/container/cli";
import { createKintoneClient } from "./kintoneClient";

export type AdminNotesCliContainerConfig = {
  baseUrl: string;
  auth: KintoneAuth;
  appId: string;
  guestSpaceId?: string;
  adminNotesFilePath: string;
  adminNotesStateFilePath: string;
  appRevisionFilePath: string;
  client?: KintoneRestAPIClient;
};

export function createAdminNotesCliContainer(
  config: AdminNotesCliContainerConfig,
): AdminNotesContainer {
  const client = config.client ?? createKintoneClient(config);

  return {
    configCodec,
    adminNotesConfigurator: new KintoneAdminNotesConfigurator(
      client,
      config.appId,
    ),
    adminNotesStorage: createLocalFileAdminNotesStorage(
      config.adminNotesFilePath,
    ),
    adminNotesStateStorage: createLocalFileAdminNotesStateStorage(
      config.adminNotesStateFilePath,
    ),
    appRevisionStorage: createLocalFileAppRevisionStorage(
      config.appRevisionFilePath,
    ),
    appRevisionReader: new KintoneAppRevisionReader(client, config.appId),
    appDeployer: new KintoneAppDeployer(client, config.appId),
  };
}
