import type { KintoneRestAPIClient } from "@kintone/rest-api-client";
import { SystemError, SystemErrorCode } from "@/core/application/error";
import type { AppRevisionReader } from "@/core/domain/appRevision/ports/appRevisionReader";
import { wrapKintoneError } from "./wrapKintoneError";

/**
 * Reads the current remote app (preview) revision in one place.
 *
 * kintone has no dedicated revision endpoint, so this calls the lightest config
 * getter that carries a revision — `getFormFields({ app, preview: true })` —
 * once and extracts only the revision. This is the exact same path as the
 * schema `FormConfigurator.getRevision()`, returning the **preview revision**,
 * so the `--all` early-skip compares like-with-like against the stored base.
 */
export class KintoneAppRevisionReader implements AppRevisionReader {
  constructor(
    private readonly client: KintoneRestAPIClient,
    private readonly appId: string,
  ) {}

  async getCurrent(): Promise<string> {
    try {
      const { revision } = await this.client.app.getFormFields({
        app: this.appId,
        preview: true,
      });
      if (!revision) {
        throw new SystemError(
          SystemErrorCode.ExternalApiError,
          "kintone API did not return an app revision",
        );
      }
      return revision;
    } catch (error) {
      throw wrapKintoneError(error, "Failed to get app revision");
    }
  }
}
