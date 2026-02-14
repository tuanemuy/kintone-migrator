import { readFile } from "node:fs/promises";
import { SystemError, SystemErrorCode } from "@/core/application/error";
import type { CustomizationStorage } from "@/core/domain/customization/ports/customizationStorage";

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}

export class LocalFileCustomizationStorage implements CustomizationStorage {
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
        `Failed to read customization config file: ${this.filePath}`,
        error,
      );
    }
  }
}
