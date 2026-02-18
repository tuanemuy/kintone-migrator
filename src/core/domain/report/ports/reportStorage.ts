import type { StorageResult } from "@/core/domain/ports/storageResult";

export interface ReportStorage {
  get(): Promise<StorageResult>;
  update(content: string): Promise<void>;
}
