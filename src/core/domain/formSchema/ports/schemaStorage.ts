import type { StorageResult } from "@/core/domain/ports/storageResult";

export interface SchemaStorage {
  get(): Promise<StorageResult>;
  update(content: string): Promise<void>;
}
