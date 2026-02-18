import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { SystemError, SystemErrorCode } from "@/core/application/error";
import type { DumpStorage } from "@/core/domain/formSchema/ports/dumpStorage";

export class LocalFileDumpStorage implements DumpStorage {
  constructor(private readonly filePrefix: string) {}

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
