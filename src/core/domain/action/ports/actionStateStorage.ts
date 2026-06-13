import type { StorageResult } from "@/core/domain/ports/storageResult";

/**
 * Port for persisting the action base snapshot (state file).
 *
 * Mirrors {@link ActionStorage}: `get()` returns `exists: false` on first run
 * (no state yet), and `update()` overwrites the state file.
 */
export interface ActionStateStorage {
  get(): Promise<StorageResult>;
  update(content: string): Promise<void>;
}
