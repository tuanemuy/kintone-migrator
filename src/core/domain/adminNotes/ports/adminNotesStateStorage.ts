import type { StorageResult } from "@/core/domain/ports/storageResult";

/**
 * Port for persisting the admin notes base snapshot (state file).
 *
 * Mirrors {@link AdminNotesStorage}: `get()` returns `exists: false` on first
 * run (no state yet), and `update()` overwrites the state file.
 */
export interface AdminNotesStateStorage {
  get(): Promise<StorageResult>;
  update(content: string): Promise<void>;
}
