import type { StorageResult } from "@/core/domain/ports/storageResult";

export interface ViewStorage {
  get(): Promise<StorageResult>;
  update(content: string): Promise<void>;
}
