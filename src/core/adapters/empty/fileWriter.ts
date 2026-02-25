import { SystemError, SystemErrorCode } from "@/core/application/error";
import type { FileWriter } from "@/core/domain/customization/ports/fileWriter";

export class EmptyFileWriter implements FileWriter {
  async write(_filePath: string, _data: ArrayBuffer): Promise<void> {
    throw new SystemError(
      SystemErrorCode.InternalServerError,
      "EmptyFileWriter.write not implemented",
    );
  }
}
