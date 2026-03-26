import type { KintoneRestAPIClient } from "@kintone/rest-api-client";
import { SystemError, SystemErrorCode } from "@/core/application/error";
import type { AppLister } from "@/core/domain/app/ports/appLister";
import type { SpaceApp } from "@/core/domain/space/entity";
import { wrapKintoneError } from "./wrapKintoneError";

const PAGE_LIMIT = 100;
const MAX_PAGES = 1000;

export class KintoneAppLister implements AppLister {
  constructor(private readonly client: KintoneRestAPIClient) {}

  async getAllApps(): Promise<readonly SpaceApp[]> {
    const result: SpaceApp[] = [];

    try {
      let offset = 0;
      let completed = false;

      for (let page = 0; page < MAX_PAGES; page++) {
        const { apps } = await this.client.app.getApps({
          limit: PAGE_LIMIT,
          offset,
        });

        for (const app of apps) {
          // code is an empty string when unset in kintone; resolveAppName handles this
          result.push({
            appId: app.appId,
            code: app.code,
            name: app.name,
          });
        }

        if (apps.length < PAGE_LIMIT) {
          completed = true;
          break;
        }

        offset += PAGE_LIMIT;
      }

      if (!completed) {
        throw new SystemError(
          SystemErrorCode.ExternalApiError,
          `Pagination did not complete within ${MAX_PAGES} pages (fetched ${result.length} apps). This may indicate an API issue.`,
        );
      }

      return result;
    } catch (error) {
      throw wrapKintoneError(
        error,
        `Failed to get apps (fetched ${result.length} so far)`,
      );
    }
  }
}
