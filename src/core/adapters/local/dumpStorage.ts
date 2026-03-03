import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { SystemError, SystemErrorCode } from "@/core/application/error";
import type { DumpStorage } from "@/core/domain/formSchema/ports/dumpStorage";
import { assertSafePath } from "@/lib/assertSafePath";

export class LocalFileDumpStorage implements DumpStorage {
  constructor(private readonly filePrefix: string) {
    // Validate that the file prefix does not escape its parent directory
    const baseDir = dirname(resolve(this.filePrefix));
    assertSafePath(`${this.filePrefix}fields.json`, baseDir);
    assertSafePath(`${this.filePrefix}layout.json`, baseDir);
  }

  async saveFields(content: string): Promise<void> {
    const filePath = `${this.filePrefix}fields.json`;
    try {
      await mkdir(dirname(filePath), { recursive: true });
      await writeFile(filePath, content, "utf-8");
    } catch (error) {
      throw new SystemError(
        SystemErrorCode.StorageError,
        `Failed to write fields dump: ${filePath}`,
        error,
      );
    }
  }

  async saveLayout(content: string): Promise<void> {
    const filePath = `${this.filePrefix}layout.json`;
    try {
      await mkdir(dirname(filePath), { recursive: true });
      await writeFile(filePath, content, "utf-8");
    } catch (error) {
      throw new SystemError(
        SystemErrorCode.StorageError,
        `Failed to write layout dump: ${filePath}`,
        error,
      );
    }
  }
}
