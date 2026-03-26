import type { KintoneRestAPIClient } from "@kintone/rest-api-client";
import type { AppLister } from "@/core/domain/app/ports/appLister";
import type { SpaceApp } from "@/core/domain/space/entity";
import { wrapKintoneError } from "./wrapKintoneError";

const PAGE_LIMIT = 100;

export class KintoneAppLister implements AppLister {
  constructor(private readonly client: KintoneRestAPIClient) {}

  async getAllApps(): Promise<readonly SpaceApp[]> {
    try {
      const result: SpaceApp[] = [];
      let offset = 0;

      for (;;) {
        const { apps } = await this.client.app.getApps({
          limit: PAGE_LIMIT,
          offset,
        });

        for (const app of apps) {
          result.push({
            appId: app.appId,
            code: app.code,
            name: app.name,
          });
        }

        if (apps.length < PAGE_LIMIT) {
          break;
        }

        offset += PAGE_LIMIT;
      }

      return result;
    } catch (error) {
      throw wrapKintoneError(error, "Failed to get apps");
    }
  }
}
