import type { StorageResult } from "@/core/domain/ports/storageResult";

export interface AdminNotesStorage {
  get(): Promise<StorageResult>;
  update(content: string): Promise<void>;
}
