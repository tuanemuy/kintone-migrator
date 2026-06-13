import type { StorageResult } from "@/core/domain/ports/storageResult";

/**
 * Port for persisting the general settings base snapshot (state file).
 *
 * Mirrors {@link GeneralSettingsStorage}: `get()` returns `exists: false` on
 * first run (no state yet), and `update()` overwrites the state file.
 */
export interface GeneralSettingsStateStorage {
  get(): Promise<StorageResult>;
  update(content: string): Promise<void>;
}
