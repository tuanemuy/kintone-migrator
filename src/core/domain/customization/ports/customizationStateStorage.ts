import type { StorageResult } from "@/core/domain/ports/storageResult";

/**
 * Port for persisting the customization base snapshot (state file).
 *
 * Mirrors {@link CustomizationStorage}: `get()` returns `exists: false` on first
 * run (no state yet), and `update()` overwrites the state file.
 */
export interface CustomizationStateStorage {
  get(): Promise<StorageResult>;
  update(content: string): Promise<void>;
}
