import type { StorageResult } from "@/core/domain/ports/storageResult";

export interface GeneralSettingsStorage {
  get(): Promise<StorageResult>;
  update(content: string): Promise<void>;
}
