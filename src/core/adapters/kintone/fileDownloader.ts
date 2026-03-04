import type { KintoneRestAPIClient } from "@kintone/rest-api-client";
import { ValidationError, ValidationErrorCode } from "@/core/application/error";
import type { FileDownloader } from "@/core/domain/customization/ports/fileDownloader";
import { wrapKintoneError } from "./wrapKintoneError";

export class KintoneFileDownloader implements FileDownloader {
  constructor(private readonly client: KintoneRestAPIClient) {}

  async download(fileKey: string): Promise<ArrayBuffer> {
    if (!fileKey) {
      throw new ValidationError(
        ValidationErrorCode.InvalidInput,
        "fileKey must not be empty",
      );
    }
    try {
      const response = await this.client.file.downloadFile({ fileKey });
      return response;
    } catch (error) {
      throw wrapKintoneError(error, `Failed to download file: ${fileKey}`);
    }
  }
}
