import type { StorageResult } from "@/core/domain/ports/storageResult";

/**
 * Port for persisting the plugin base snapshot (state file).
 *
 * Mirrors {@link PluginStorage}: `get()` returns `exists: false` on first run
 * (no state yet), and `update()` overwrites the state file.
 */
export interface PluginStateStorage {
  get(): Promise<StorageResult>;
  update(content: string): Promise<void>;
}
