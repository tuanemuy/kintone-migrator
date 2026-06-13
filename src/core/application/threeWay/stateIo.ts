import type { ConfigCodec } from "@/core/domain/ports/configCodec";
import type { StorageResult } from "@/core/domain/ports/storageResult";
import { wrapBusinessRuleError } from "../error";
import { parseConfigText } from "../parseConfigText";
import { stringifyConfig } from "../stringifyConfig";

/** Minimal storage shape shared by every domain's snapshot state port. */
export interface SnapshotStateStorage {
  get(): Promise<StorageResult>;
  update(content: string): Promise<void>;
}

/**
 * Loads and parses a domain snapshot state, or returns undefined when none
 * exists (first run). Generic over the snapshot type `TSnapshot`.
 *
 * The caller supplies a `parse` (pre-parsed `unknown` -> snapshot, domain
 * parser) so this stays yaml-agnostic and routes codec/business errors through
 * the standard application-layer wrappers (ADR-188 ステップ3).
 */
export async function loadSnapshotState<TSnapshot>(
  storage: SnapshotStateStorage,
  codec: ConfigCodec,
  parse: (parsed: unknown) => TSnapshot,
  label: string,
): Promise<TSnapshot | undefined> {
  const result = await storage.get();
  if (!result.exists) {
    return undefined;
  }
  const parsed = parseConfigText(codec, result.content, label);
  return wrapBusinessRuleError(() => parse(parsed));
}

/**
 * Serializes and persists a domain snapshot state via the codec port. The
 * caller supplies a domain `serialize` (snapshot -> plain record).
 */
export async function saveSnapshotState<TSnapshot>(
  storage: SnapshotStateStorage,
  codec: ConfigCodec,
  serialize: (snapshot: TSnapshot) => Record<string, unknown>,
  snapshot: TSnapshot,
): Promise<void> {
  const data = serialize(snapshot);
  const text = stringifyConfig(codec, data);
  await storage.update(text);
}
