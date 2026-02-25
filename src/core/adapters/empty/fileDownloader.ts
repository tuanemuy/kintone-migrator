import { SystemError, SystemErrorCode } from "@/core/application/error";
import type { FileDownloader } from "@/core/domain/customization/ports/fileDownloader";

export class EmptyFileDownloader implements FileDownloader {
  async download(_fileKey: string): Promise<ArrayBuffer> {
    throw new SystemError(
      SystemErrorCode.InternalServerError,
      "EmptyFileDownloader.download not implemented",
    );
  }
}
