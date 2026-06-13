import type { ActionState } from "../state";
import { ActionConfigSerializer } from "./configSerializer";

/**
 * Serializes an {@link ActionState} to a plain object suitable for YAML
 * stringification (via the codec port in the application layer).
 *
 * The snapshot is serialized through the exact same path as `capture`
 * ({@link ActionConfigSerializer}) so the state file is round-trip compatible
 * with the captured config. The app revision is NOT written here; it is
 * persisted separately via `AppRevisionStorage` (ADR-188-001).
 */
export const ActionStateSerializer = {
  serialize: (state: ActionState): Record<string, unknown> =>
    ActionConfigSerializer.serialize(state.config),
};
