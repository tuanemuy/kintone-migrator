import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { SystemError, SystemErrorCode } from "@/core/application/error";
import type { GeneralSettingsStorage } from "@/core/domain/generalSettings/ports/generalSettingsStorage";
import type { StorageResult } from "@/core/domain/ports/storageResult";
import { isNodeError } from "@/lib/nodeError";

export class LocalFileGeneralSettingsStorage implements GeneralSettingsStorage {
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
        `Failed to read general settings file: ${this.filePath}`,
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
        `Failed to write general settings file: ${this.filePath}`,
        error,
      );
    }
  }
}
