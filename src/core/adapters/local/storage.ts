import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { SystemError, SystemErrorCode } from "@/core/application/error";
import type { StorageResult } from "@/core/domain/ports/storageResult";
import { isNodeError } from "@/lib/nodeError";

export function createLocalFileStorage(
  filePath: string,
  label = "file",
): {
  get(): Promise<StorageResult>;
  update(content: string): Promise<void>;
} {
  return {
    async get(): Promise<StorageResult> {
      try {
        const content = await readFile(filePath, "utf-8");
        return { exists: true, content };
      } catch (error) {
        if (isNodeError(error) && error.code === "ENOENT") {
          return { exists: false };
        }
        throw new SystemError(
          SystemErrorCode.StorageError,
          `Failed to read ${label}: ${filePath}`,
          error,
        );
      }
    },
    async update(content: string): Promise<void> {
      try {
        await mkdir(dirname(filePath), { recursive: true });
        await writeFile(filePath, content, "utf-8");
      } catch (error) {
        throw new SystemError(
          SystemErrorCode.StorageError,
          `Failed to write ${label}: ${filePath}`,
          error,
        );
      }
    },
  };
}
