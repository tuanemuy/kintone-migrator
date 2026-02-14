import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { SystemError, SystemErrorCode } from "@/core/application/error";
import type { FieldPermissionStorage } from "@/core/domain/fieldPermission/ports/fieldPermissionStorage";
import { isNodeError } from "@/lib/nodeError";

export class LocalFileFieldPermissionStorage implements FieldPermissionStorage {
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
        `Failed to read field permission file: ${this.filePath}`,
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
        `Failed to write field permission file: ${this.filePath}`,
        error,
      );
    }
  }
}
