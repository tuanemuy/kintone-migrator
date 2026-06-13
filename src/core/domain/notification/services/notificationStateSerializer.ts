import type { NotificationState } from "../state";
import { NotificationConfigSerializer } from "./configSerializer";

/**
 * Serializes a {@link NotificationState} to a plain object suitable for YAML
 * stringification (via the codec port in the application layer).
 *
 * The snapshot is serialized through the exact same path as `capture`
 * ({@link NotificationConfigSerializer}) so the state file is round-trip
 * compatible with the captured config. The app revision is NOT written here; it
 * is persisted separately via `AppRevisionStorage` (ADR-188-001).
 */
export const NotificationStateSerializer = {
  serialize: (state: NotificationState): Record<string, unknown> =>
    NotificationConfigSerializer.serialize(state.config),
};
