import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { SystemError, SystemErrorCode } from "@/core/application/error";
import type { FileWriter } from "@/core/domain/customization/ports/fileWriter";
import { assertSafePath } from "@/lib/assertSafePath";

export class LocalFileWriter implements FileWriter {
  constructor(private readonly baseDir: string = process.cwd()) {}

  async write(filePath: string, data: ArrayBuffer): Promise<void> {
    const resolvedPath = resolve(this.baseDir, filePath);
    assertSafePath(resolvedPath, this.baseDir);
    try {
      await mkdir(dirname(resolvedPath), { recursive: true });
      await writeFile(resolvedPath, Buffer.from(new Uint8Array(data)));
    } catch (error) {
      throw new SystemError(
        SystemErrorCode.StorageError,
        `Failed to write file: ${filePath}`,
        error,
      );
    }
  }
}
