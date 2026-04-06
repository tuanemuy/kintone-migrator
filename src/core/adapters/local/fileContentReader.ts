import { readFile } from "node:fs/promises";
import { SystemError, SystemErrorCode } from "@/core/application/error";
import type { FileContentReader } from "@/core/domain/customization/ports/fileContentReader";

export class LocalFileContentReader implements FileContentReader {
  async read(filePath: string): Promise<ArrayBuffer> {
    try {
      const buffer = await readFile(filePath);
      return buffer.buffer.slice(
        buffer.byteOffset,
        buffer.byteOffset + buffer.byteLength,
      );
    } catch (error) {
      throw new SystemError(
        SystemErrorCode.StorageError,
        `Failed to read file: ${filePath}`,
        error,
      );
    }
  }
}
