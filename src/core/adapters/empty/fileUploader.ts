import { SystemError, SystemErrorCode } from "@/core/application/error";
import type { FileUploader } from "@/core/domain/customization/ports/fileUploader";

export class EmptyFileUploader implements FileUploader {
  async upload(_filePath: string): Promise<{ fileKey: string }> {
    throw new SystemError(
      SystemErrorCode.InternalServerError,
      "EmptyFileUploader.upload not implemented",
    );
  }
}
