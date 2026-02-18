import type { StorageResult } from "@/core/domain/ports/storageResult";

export interface AppPermissionStorage {
  get(): Promise<StorageResult>;
  update(content: string): Promise<void>;
}
