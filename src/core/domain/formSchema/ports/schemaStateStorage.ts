import type { StorageResult } from "@/core/domain/ports/storageResult";

/**
 * Port for persisting the schema base snapshot (state file).
 *
 * Mirrors {@link SchemaStorage}: `get()` returns `exists: false` on first run
 * (no state yet), and `update()` overwrites the state file.
 */
export interface SchemaStateStorage {
  get(): Promise<StorageResult>;
  update(content: string): Promise<void>;
}
