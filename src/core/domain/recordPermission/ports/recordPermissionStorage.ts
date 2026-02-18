import type { StorageResult } from "@/core/domain/ports/storageResult";

export interface RecordPermissionStorage {
  get(): Promise<StorageResult>;
  update(content: string): Promise<void>;
}
