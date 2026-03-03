import { KintoneRestAPIClient } from "@kintone/rest-api-client";
import { buildKintoneAuth, type KintoneAuth } from "./cli";

export type KintoneClientConfig = {
  baseUrl: string;
  auth: KintoneAuth;
  guestSpaceId?: string;
};

export function createKintoneClient(
  config: KintoneClientConfig,
): KintoneRestAPIClient {
  return new KintoneRestAPIClient({
    baseUrl: config.baseUrl,
    auth: buildKintoneAuth(config.auth),
    guestSpaceId: config.guestSpaceId,
  });
}
