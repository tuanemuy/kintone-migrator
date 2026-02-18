import type { StorageResult } from "@/core/domain/ports/storageResult";

export interface SeedStorage {
  get(): Promise<StorageResult>;
  update(content: string): Promise<void>;
}
