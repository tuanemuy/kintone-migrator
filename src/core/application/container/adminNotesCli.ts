import type { KintoneRestAPIClient } from "@kintone/rest-api-client";
import { KintoneAdminNotesConfigurator } from "@/core/adapters/kintone/adminNotesConfigurator";
import { KintoneAppDeployer } from "@/core/adapters/kintone/appDeployer";
import { createLocalFileAdminNotesStorage } from "@/core/adapters/local/adminNotesStorage";
import type { AdminNotesContainer } from "@/core/application/container/adminNotes";
import type { KintoneAuth } from "@/core/application/container/cli";
import { createKintoneClient } from "./kintoneClient";

export type AdminNotesCliContainerConfig = {
  baseUrl: string;
  auth: KintoneAuth;
  appId: string;
  guestSpaceId?: string;
  adminNotesFilePath: string;
  client?: KintoneRestAPIClient;
};

export function createAdminNotesCliContainer(
  config: AdminNotesCliContainerConfig,
): AdminNotesContainer {
  const client = config.client ?? createKintoneClient(config);

  return {
    adminNotesConfigurator: new KintoneAdminNotesConfigurator(
      client,
      config.appId,
    ),
    adminNotesStorage: createLocalFileAdminNotesStorage(
      config.adminNotesFilePath,
    ),
    appDeployer: new KintoneAppDeployer(client, config.appId),
  };
}
