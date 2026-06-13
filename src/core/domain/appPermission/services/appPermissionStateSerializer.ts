import type { AppPermissionState } from "../state";
import { AppPermissionConfigSerializer } from "./configSerializer";

/**
 * Serializes an {@link AppPermissionState} to a plain object suitable for YAML
 * stringification (via the codec port in the application layer).
 *
 * The snapshot is serialized through the exact same path as `capture`
 * ({@link AppPermissionConfigSerializer}) so the state file is round-trip
 * compatible with the captured config. The app revision is NOT written here; it
 * is persisted separately via `AppRevisionStorage`.
 */
export const AppPermissionStateSerializer = {
  serialize: (state: AppPermissionState): Record<string, unknown> =>
    AppPermissionConfigSerializer.serialize(state.config),
};
