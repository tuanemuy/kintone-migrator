import type { AdminNotesState } from "../state";
import { AdminNotesConfigSerializer } from "./configSerializer";

/**
 * Serializes an {@link AdminNotesState} to a plain object suitable for YAML
 * stringification (via the codec port in the application layer).
 *
 * The snapshot is serialized through the exact same path as `capture`
 * ({@link AdminNotesConfigSerializer}) so the state file is round-trip
 * compatible with the captured config. The app revision is NOT written here; it
 * is persisted separately via `AppRevisionStorage`.
 */
export const AdminNotesStateSerializer = {
  serialize: (state: AdminNotesState): Record<string, unknown> =>
    AdminNotesConfigSerializer.serialize(state.config),
};
