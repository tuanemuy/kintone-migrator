import type { KintoneRestAPIClient } from "@kintone/rest-api-client";
import { SystemError, SystemErrorCode } from "@/core/application/error";
import type { FileDownloader } from "@/core/domain/customization/ports/fileDownloader";
import { isBusinessRuleError } from "@/core/domain/error";

export class KintoneFileDownloader implements FileDownloader {
  constructor(private readonly client: KintoneRestAPIClient) {}

  async download(fileKey: string): Promise<ArrayBuffer> {
    if (!fileKey) {
      throw new SystemError(
        SystemErrorCode.ExternalApiError,
        "fileKey must not be empty",
      );
    }
    try {
      const response = await this.client.file.downloadFile({ fileKey });
      return response;
    } catch (error) {
      if (isBusinessRuleError(error)) throw error;
      if (error instanceof SystemError) throw error;
      throw new SystemError(
        SystemErrorCode.ExternalApiError,
        `Failed to download file: ${fileKey}`,
        error,
      );
    }
  }
}
