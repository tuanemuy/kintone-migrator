import type { StorageResult } from "@/core/domain/ports/storageResult";

export interface PluginStorage {
  get(): Promise<StorageResult>;
  update(content: string): Promise<void>;
}
