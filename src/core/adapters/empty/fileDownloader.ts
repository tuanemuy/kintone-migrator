import { SystemError, SystemErrorCode } from "@/core/application/error";
import type { FileDownloader } from "@/core/domain/customization/ports/fileDownloader";

export const emptyFileDownloader: FileDownloader = {
  async download() {
    throw new SystemError(
      SystemErrorCode.InternalServerError,
      "EmptyFileDownloader.download not implemented",
    );
  },
};
