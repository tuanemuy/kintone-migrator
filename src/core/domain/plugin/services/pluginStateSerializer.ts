import type { PluginState } from "../state";
import { PluginConfigSerializer } from "./configSerializer";

/**
 * Serializes a {@link PluginState} to a plain object suitable for YAML
 * stringification (via the codec port in the application layer).
 *
 * The snapshot is serialized through the exact same path as `capture`
 * ({@link PluginConfigSerializer}) so the state file is round-trip compatible
 * with the captured config. The app revision is NOT written here; it is
 * persisted separately via `AppRevisionStorage`.
 */
export const PluginStateSerializer = {
  serialize: (state: PluginState): Record<string, unknown> =>
    PluginConfigSerializer.serialize(state.config),
};
