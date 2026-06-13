import type { StorageResult } from "@/core/domain/ports/storageResult";

/**
 * Port for persisting the process management base snapshot (state file).
 *
 * Mirrors {@link ProcessManagementStorage}: `get()` returns `exists: false` on
 * first run (no state yet), and `update()` overwrites the state file.
 */
export interface ProcessManagementStateStorage {
  get(): Promise<StorageResult>;
  update(content: string): Promise<void>;
}
