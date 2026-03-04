import { resolve } from "node:path";
import type { KintoneRestAPIClient } from "@kintone/rest-api-client";
import { ValidationError, ValidationErrorCode } from "@/core/application/error";
import type { FileUploader } from "@/core/domain/customization/ports/fileUploader";
import { isSafePath } from "@/lib/safePath";
import { wrapKintoneError } from "./wrapKintoneError";

export class KintoneFileUploader implements FileUploader {
  constructor(
    private readonly client: KintoneRestAPIClient,
    private readonly baseDir: string,
  ) {}

  async upload(filePath: string): Promise<{ fileKey: string }> {
    if (!filePath) {
      throw new ValidationError(
        ValidationErrorCode.InvalidInput,
        "filePath must not be empty",
      );
    }
    const resolvedPath = resolve(this.baseDir, filePath);
    if (!isSafePath(resolvedPath, this.baseDir)) {
      throw new ValidationError(
        ValidationErrorCode.InvalidInput,
        `Path traversal detected: "${resolvedPath}" escapes base directory "${this.baseDir}"`,
      );
    }
    try {
      const response = await this.client.file.uploadFile({
        file: { path: resolvedPath },
      });
      return { fileKey: response.fileKey };
    } catch (error) {
      throw wrapKintoneError(error, `Failed to upload file: ${filePath}`);
    }
  }
}
