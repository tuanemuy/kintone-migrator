import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { SystemError, SystemErrorCode } from "@/core/application/error";
import type { RecordPermissionStorage } from "@/core/domain/recordPermission/ports/recordPermissionStorage";
import { isNodeError } from "@/lib/nodeError";

export class LocalFileRecordPermissionStorage
  implements RecordPermissionStorage
{
  constructor(private readonly filePath: string) {}

  async get(): Promise<{ content: string; exists: boolean }> {
    try {
      const content = await readFile(this.filePath, "utf-8");
      return { content, exists: true };
    } catch (error) {
      if (isNodeError(error) && error.code === "ENOENT") {
        return { content: "", exists: false };
      }
      throw new SystemError(
        SystemErrorCode.StorageError,
        `Failed to read record permission file: ${this.filePath}`,
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
        `Failed to write record permission file: ${this.filePath}`,
        error,
      );
    }
  }
}
