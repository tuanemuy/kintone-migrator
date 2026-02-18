import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { SystemError, SystemErrorCode } from "@/core/application/error";
import type { StorageResult } from "@/core/domain/ports/storageResult";
import type { ReportStorage } from "@/core/domain/report/ports/reportStorage";
import { isNodeError } from "@/lib/nodeError";

export class LocalFileReportStorage implements ReportStorage {
  constructor(private readonly filePath: string) {}

  async get(): Promise<StorageResult> {
    try {
      const content = await readFile(this.filePath, "utf-8");
      return { content, exists: true };
    } catch (error) {
      if (isNodeError(error) && error.code === "ENOENT") {
        return { exists: false };
      }
      throw new SystemError(
        SystemErrorCode.StorageError,
        `Failed to read report file: ${this.filePath}`,
        error,
      );
    }
  }

  async update(content: string): Promise<void> {
    try {
      await mkdir(dirname(this.filePath), { recursive: true });
      await writeFile(this.filePath, content, "utf-8");
    } catch (error) {
      throw new SystemError(
        SystemErrorCode.StorageError,
        `Failed to write report file: ${this.filePath}`,
        error,
      );
    }
  }
}
