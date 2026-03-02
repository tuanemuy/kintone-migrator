import type { KintoneRestAPIClient } from "@kintone/rest-api-client";
import { KintoneFormDumpReader } from "@/core/adapters/kintone/formDumpReader";
import { LocalFileDumpStorage } from "@/core/adapters/local/dumpStorage";
import type { DumpContainer } from "@/core/application/container/dump";
import type { KintoneAuth } from "./cli";
import { createKintoneClient } from "./kintoneClient";

export type DumpCliContainerConfig = {
  baseUrl: string;
  auth: KintoneAuth;
  appId: string;
  guestSpaceId?: string;
  filePrefix: string;
  client?: KintoneRestAPIClient;
};

export function createDumpCliContainer(
  config: DumpCliContainerConfig,
): DumpContainer {
  const client = config.client ?? createKintoneClient(config);

  return {
    formDumpReader: new KintoneFormDumpReader(client, config.appId),
    dumpStorage: new LocalFileDumpStorage(config.filePrefix),
  };
}
