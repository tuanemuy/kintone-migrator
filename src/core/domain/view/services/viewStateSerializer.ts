import type { ViewState } from "../state";
import { ViewConfigSerializer } from "./configSerializer";

/**
 * Serializes a {@link ViewState} to a plain object suitable for YAML
 * stringification (via the codec port in the application layer).
 *
 * The snapshot is serialized through the exact same path as `capture`
 * ({@link ViewConfigSerializer}) so the state file is round-trip compatible
 * with the captured config. The app revision is NOT written here; it is
 * persisted separately via `AppRevisionStorage` (ADR-188-001).
 */
export const ViewStateSerializer = {
  serialize: (state: ViewState): Record<string, unknown> =>
    ViewConfigSerializer.serialize(state.config),
};
