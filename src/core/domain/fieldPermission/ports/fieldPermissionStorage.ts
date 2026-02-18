import type { StorageResult } from "@/core/domain/ports/storageResult";

export interface FieldPermissionStorage {
  get(): Promise<StorageResult>;
  update(content: string): Promise<void>;
}
