import type { CustomizationState } from "../state";
import { CustomizationConfigSerializer } from "./configSerializer";

/**
 * Serializes a {@link CustomizationState} to a plain object suitable for YAML
 * stringification (via the codec port in the application layer).
 *
 * The snapshot is serialized through the exact same path as `capture`
 * ({@link CustomizationConfigSerializer}) so the state file is round-trip
 * compatible with the captured config. The app revision is NOT written here; it
 * is persisted separately via `AppRevisionStorage` (ADR-188-001).
 */
export const CustomizationStateSerializer = {
  serialize: (state: CustomizationState): Record<string, unknown> =>
    CustomizationConfigSerializer.serialize(state.config),
};
