import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { SystemError, SystemErrorCode } from "@/core/application/error";
import type { ProcessManagementStorage } from "@/core/domain/processManagement/ports/processManagementStorage";
import type { StorageResult } from "@/core/domain/ports/storageResult";
import { isNodeError } from "@/lib/nodeError";

export class LocalFileProcessManagementStorage
  implements ProcessManagementStorage
{
  constructor(private readonly filePath: string) {}

  async get(): Promise<StorageResult> {
    try {
      const content = await readFile(this.filePath, "utf-8");
      return { exists: true, content };
    } catch (error) {
      if (isNodeError(error) && error.code === "ENOENT") {
        return { exists: false };
      }
      throw new SystemError(
        SystemErrorCode.StorageError,
        `Failed to read process management file: ${this.filePath}`,
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
        `Failed to write process management file: ${this.filePath}`,
        error,
      );
    }
  }
}
