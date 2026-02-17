import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { SystemError, SystemErrorCode } from "@/core/application/error";
import type { PluginStorage } from "@/core/domain/plugin/ports/pluginStorage";
import { isNodeError } from "@/lib/nodeError";

export class LocalFilePluginStorage implements PluginStorage {
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
        `Failed to read plugin file: ${this.filePath}`,
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
        `Failed to write plugin file: ${this.filePath}`,
        error,
      );
    }
  }
}
