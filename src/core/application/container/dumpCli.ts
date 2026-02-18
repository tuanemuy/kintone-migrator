import { KintoneRestAPIClient } from "@kintone/rest-api-client";
import { KintoneFormDumpReader } from "@/core/adapters/kintone/formDumpReader";
import { LocalFileDumpStorage } from "@/core/adapters/local/dumpStorage";
import type { DumpContainer } from "@/core/application/container/dump";
import { buildKintoneAuth, type KintoneAuth } from "./cli";

export type DumpCliContainerConfig = {
  baseUrl: string;
  auth: KintoneAuth;
  appId: string;
  guestSpaceId?: string;
  filePrefix: string;
};

export function createDumpCliContainer(
  config: DumpCliContainerConfig,
): DumpContainer {
  const client = new KintoneRestAPIClient({
    baseUrl: config.baseUrl,
    auth: buildKintoneAuth(config.auth),
    guestSpaceId: config.guestSpaceId,
  });

  return {
    formDumpReader: new KintoneFormDumpReader(client, config.appId),
    dumpStorage: new LocalFileDumpStorage(config.filePrefix),
  };
}
