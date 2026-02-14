import type { KintoneRestAPIClient } from "@kintone/rest-api-client";
import { SystemError, SystemErrorCode } from "@/core/application/error";
import type { FileUploader } from "@/core/domain/customization/ports/fileUploader";
import { isBusinessRuleError } from "@/core/domain/error";

export class KintoneFileUploader implements FileUploader {
  constructor(private readonly client: KintoneRestAPIClient) {}

  async upload(filePath: string): Promise<{ fileKey: string }> {
    try {
      const response = await this.client.file.uploadFile({
        file: { path: filePath },
      });
      return { fileKey: response.fileKey };
    } catch (error) {
      if (isBusinessRuleError(error)) throw error;
      if (error instanceof SystemError) throw error;
      throw new SystemError(
        SystemErrorCode.ExternalApiError,
        `Failed to upload file: ${filePath}`,
        error,
      );
    }
  }
}
