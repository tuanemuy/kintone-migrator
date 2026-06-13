import type { StorageResult } from "@/core/domain/ports/storageResult";

/**
 * Port for persisting the report base snapshot (state file).
 *
 * Mirrors {@link ReportStorage}: `get()` returns `exists: false` on first run
 * (no state yet), and `update()` overwrites the state file.
 */
export interface ReportStateStorage {
  get(): Promise<StorageResult>;
  update(content: string): Promise<void>;
}
