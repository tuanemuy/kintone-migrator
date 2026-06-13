import type { ProcessManagementState } from "../state";
import { ProcessManagementConfigSerializer } from "./configSerializer";

/**
 * Serializes a {@link ProcessManagementState} to a plain object suitable for
 * YAML stringification (via the codec port in the application layer).
 *
 * The snapshot is serialized through the exact same path as `capture`
 * ({@link ProcessManagementConfigSerializer}) so the state file is round-trip
 * compatible with the captured config. The app revision is NOT written here; it
 * is persisted separately via `AppRevisionStorage`.
 */
export const ProcessManagementStateSerializer = {
  serialize: (state: ProcessManagementState): Record<string, unknown> =>
    ProcessManagementConfigSerializer.serialize(state.config),
};
