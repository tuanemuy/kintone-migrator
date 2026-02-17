import type { KintoneRestAPIClient } from "@kintone/rest-api-client";
import { SystemError, SystemErrorCode } from "@/core/application/error";
import type { SpaceApp } from "@/core/domain/space/entity";
import type { SpaceReader } from "@/core/domain/space/ports/spaceReader";

export class KintoneSpaceReader implements SpaceReader {
  constructor(private readonly client: KintoneRestAPIClient) {}

  async getSpaceApps(spaceId: string): Promise<readonly SpaceApp[]> {
    try {
      const space = await this.client.space.getSpace({ id: spaceId });

      // attachedApps is returned by the kintone API but not included in the SDK type definitions
      const spaceRecord = space as Record<string, unknown>;
      const rawApps = spaceRecord.attachedApps;

      if (!Array.isArray(rawApps)) {
        return [];
      }

      return rawApps
        .filter(
          (app): app is Record<string, unknown> =>
            typeof app === "object" && app !== null,
        )
        .map((app) => ({
          appId: String(app.appId ?? ""),
          code: typeof app.code === "string" ? app.code : "",
          name: typeof app.name === "string" ? app.name : "",
        }));
    } catch (error) {
      if (error instanceof SystemError) throw error;
      throw new SystemError(
        SystemErrorCode.ExternalApiError,
        `Failed to get space info for space ID: ${spaceId}`,
        error,
      );
    }
  }
}
