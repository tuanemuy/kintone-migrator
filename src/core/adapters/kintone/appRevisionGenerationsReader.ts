import {
  type KintoneRestAPIClient,
  KintoneRestAPIError,
} from "@kintone/rest-api-client";
import { SystemError, SystemErrorCode } from "@/core/application/error";
import type { AppRevisionGenerationsReader } from "@/core/domain/appRevision/ports/appRevisionGenerationsReader";
import type {
  AppRevisionGenerations,
  PublishedAppRevision,
} from "@/core/domain/appRevision/valueObject";
import { wrapKintoneError } from "./wrapKintoneError";

// kintone answers a published read of a never-deployed app with the same code
// as a read of an app that does not exist.
const KINTONE_APP_NOT_FOUND_CODE = "GAIA_AP01";

/**
 * Reads both generations' revisions through `getAppAcl`.
 *
 * The app revision is shared by every settings endpoint, so any getter would
 * do; `getAppAcl` is the one that needs only app management permission for
 * both generations (other published getters such as `getViews` also require
 * record view permission), so this works with the same credentials as every
 * other command.
 */
export class KintoneAppRevisionGenerationsReader
  implements AppRevisionGenerationsReader
{
  constructor(
    private readonly client: KintoneRestAPIClient,
    private readonly appId: string,
  ) {}

  async read(): Promise<AppRevisionGenerations> {
    const preview = await this.readPreview();
    const published = await this.readPublished();
    if (published.kind === "neverDeployed") {
      // The published read cannot tell "never deployed" from "deleted", so
      // confirm the app still exists; if it was deleted after the first read,
      // this throws instead of reporting a deploy that would publish everything.
      await this.readPreview();
    }
    return { preview, published };
  }

  private async readPreview(): Promise<string> {
    try {
      return await this.fetchRevision(true);
    } catch (error) {
      throw wrapKintoneError(error, "Failed to get the preview app revision");
    }
  }

  private async readPublished(): Promise<PublishedAppRevision> {
    try {
      return { kind: "deployed", revision: await this.fetchRevision(false) };
    } catch (error) {
      if (
        error instanceof KintoneRestAPIError &&
        error.code === KINTONE_APP_NOT_FOUND_CODE
      ) {
        return { kind: "neverDeployed" };
      }
      throw wrapKintoneError(error, "Failed to get the published app revision");
    }
  }

  private async fetchRevision(preview: boolean): Promise<string> {
    const { revision } = await this.client.app.getAppAcl({
      app: this.appId,
      preview,
    });
    if (!revision) {
      throw new SystemError(
        SystemErrorCode.ExternalApiError,
        "kintone API did not return an app revision",
      );
    }
    return revision;
  }
}
