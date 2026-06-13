import type { GeneralSettingsState } from "../state";
import { GeneralSettingsConfigSerializer } from "./configSerializer";

/**
 * Serializes a {@link GeneralSettingsState} to a plain object suitable for YAML
 * stringification (via the codec port in the application layer).
 *
 * The snapshot is serialized through the exact same path as `capture`
 * ({@link GeneralSettingsConfigSerializer}) so the state file is round-trip
 * compatible with the captured config. The app revision is NOT written here; it
 * is persisted separately via `AppRevisionStorage` (ADR-188-001).
 */
export const GeneralSettingsStateSerializer = {
  serialize: (state: GeneralSettingsState): Record<string, unknown> =>
    GeneralSettingsConfigSerializer.serialize(state.config),
};
