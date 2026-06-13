import type { StorageResult } from "@/core/domain/ports/storageResult";

/**
 * Port for persisting the view base snapshot (state file).
 *
 * Mirrors {@link ViewStorage}: `get()` returns `exists: false` on first run
 * (no state yet), and `update()` overwrites the state file.
 */
export interface ViewStateStorage {
  get(): Promise<StorageResult>;
  update(content: string): Promise<void>;
}
