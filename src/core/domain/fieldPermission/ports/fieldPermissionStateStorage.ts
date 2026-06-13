import type { StorageResult } from "@/core/domain/ports/storageResult";

/**
 * Port for persisting the field permission base snapshot (state file).
 *
 * Mirrors {@link FieldPermissionStorage}: `get()` returns `exists: false` on
 * first run (no state yet), and `update()` overwrites the state file.
 */
export interface FieldPermissionStateStorage {
  get(): Promise<StorageResult>;
  update(content: string): Promise<void>;
}
