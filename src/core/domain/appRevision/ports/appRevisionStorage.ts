import type { StorageResult } from "@/core/domain/ports/storageResult";

/**
 * Port for persisting the locally saved base app revision
 * (`state/<appName>/revision.yaml`).
 *
 * Mirrors {@link SchemaStateStorage}: `get()` returns `exists: false` on first
 * run (no revision saved yet), and `update()` overwrites the file. This is the
 * single app-scoped base revision shared by every config domain (ADR-188-001).
 *
 * This is the local *base* revision; the current *remote* revision is read via
 * the separate {@link AppRevisionReader} (ADR-188-007).
 */
export interface AppRevisionStorage {
  get(): Promise<StorageResult>;
  update(content: string): Promise<void>;
}
