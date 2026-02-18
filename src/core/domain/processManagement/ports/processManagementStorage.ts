import type { StorageResult } from "@/core/domain/ports/storageResult";

export interface ProcessManagementStorage {
  get(): Promise<StorageResult>;
  update(content: string): Promise<void>;
}
