import { SystemError, SystemErrorCode } from "@/core/application/error";
import type { FileWriter } from "@/core/domain/customization/ports/fileWriter";

export const emptyFileWriter: FileWriter = {
  async write() {
    throw new SystemError(
      SystemErrorCode.InternalServerError,
      "EmptyFileWriter.write not implemented",
    );
  },
};
