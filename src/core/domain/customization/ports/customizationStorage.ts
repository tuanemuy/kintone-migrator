import type { StorageResult } from "@/core/domain/ports/storageResult";

export interface CustomizationStorage {
  get(): Promise<StorageResult>;
  update(content: string): Promise<void>;
}
