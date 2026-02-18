import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { SystemError, SystemErrorCode } from "@/core/application/error";
import type { FileWriter } from "@/core/domain/customization/ports/fileWriter";

export class LocalFileWriter implements FileWriter {
  async write(filePath: string, data: ArrayBuffer): Promise<void> {
    try {
      await mkdir(dirname(filePath), { recursive: true });
      await writeFile(filePath, Buffer.from(new Uint8Array(data)));
    } catch (error) {
      if (error instanceof SystemError) throw error;
      throw new SystemError(
        SystemErrorCode.StorageError,
        `Failed to write file: ${filePath}`,
        error,
      );
    }
  }
}
