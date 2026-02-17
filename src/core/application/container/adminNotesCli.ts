import { KintoneRestAPIClient } from "@kintone/rest-api-client";
import { KintoneAdminNotesConfigurator } from "@/core/adapters/kintone/adminNotesConfigurator";
import { KintoneAppDeployer } from "@/core/adapters/kintone/appDeployer";
import { LocalFileAdminNotesStorage } from "@/core/adapters/local/adminNotesStorage";
import type { AdminNotesContainer } from "@/core/application/container/adminNotes";
import {
  buildKintoneAuth,
  type KintoneAuth,
} from "@/core/application/container/cli";

export type AdminNotesCliContainerConfig = {
  baseUrl: string;
  auth: KintoneAuth;
  appId: string;
  guestSpaceId?: string;
  adminNotesFilePath: string;
};

export function createAdminNotesCliContainer(
  config: AdminNotesCliContainerConfig,
): AdminNotesContainer {
  const client = new KintoneRestAPIClient({
    baseUrl: config.baseUrl,
    auth: buildKintoneAuth(config.auth),
    guestSpaceId: config.guestSpaceId,
  });

  return {
    adminNotesConfigurator: new KintoneAdminNotesConfigurator(
      client,
      config.appId,
    ),
    adminNotesStorage: new LocalFileAdminNotesStorage(
      config.adminNotesFilePath,
    ),
    appDeployer: new KintoneAppDeployer(client, config.appId),
  };
}
