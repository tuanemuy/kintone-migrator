import type { StorageResult } from "@/core/domain/ports/storageResult";

/**
 * Port for persisting the app permission base snapshot (state file).
 *
 * Mirrors {@link AppPermissionStorage}: `get()` returns `exists: false` on first
 * run (no state yet), and `update()` overwrites the state file.
 */
export interface AppPermissionStateStorage {
  get(): Promise<StorageResult>;
  update(content: string): Promise<void>;
}
