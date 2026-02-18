import type { StorageResult } from "@/core/domain/ports/storageResult";

export interface ActionStorage {
  get(): Promise<StorageResult>;
  update(content: string): Promise<void>;
}
