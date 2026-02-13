import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { SystemError, SystemErrorCode } from "@/core/application/error";
import type { SeedStorage } from "@/core/domain/seedData/ports/seedStorage";

export class LocalFileSeedStorage implements SeedStorage {
  constructor(private readonly filePath: string) {}

  async get(): Promise<string> {
    try {
      return await readFile(this.filePath, "utf-8");
    } catch (error) {
      if (isNodeError(error) && error.code === "ENOENT") {
        return "";
      }
      throw new SystemError(
        SystemErrorCode.StorageError,
        `Failed to read seed file: ${this.filePath}`,
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
        `Failed to write seed file: ${this.filePath}`,
        error,
      );
    }
  }
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
