import type { StorageResult } from "@/core/domain/ports/storageResult";

/**
 * Port for persisting the notification base snapshot (state file).
 *
 * Mirrors {@link NotificationStorage}: `get()` returns `exists: false` on first
 * run (no state yet), and `update()` overwrites the state file.
 */
export interface NotificationStateStorage {
  get(): Promise<StorageResult>;
  update(content: string): Promise<void>;
}
