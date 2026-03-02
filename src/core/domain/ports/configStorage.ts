import type { StorageResult } from "./storageResult";

export interface ConfigStorage {
  get(): Promise<StorageResult>;
  update(content: string): Promise<void>;
}
