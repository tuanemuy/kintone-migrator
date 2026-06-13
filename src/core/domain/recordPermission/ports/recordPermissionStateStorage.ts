import type { StorageResult } from "@/core/domain/ports/storageResult";

/**
 * Port for persisting the record permission base snapshot (state file).
 *
 * Mirrors {@link RecordPermissionStorage}: `get()` returns `exists: false` on
 * first run (no state yet), and `update()` overwrites the state file.
 */
export interface RecordPermissionStateStorage {
  get(): Promise<StorageResult>;
  update(content: string): Promise<void>;
}
