import type { FieldPermissionState } from "../state";
import { FieldPermissionConfigSerializer } from "./configSerializer";

/**
 * Serializes a {@link FieldPermissionState} to a plain object suitable for YAML
 * stringification (via the codec port in the application layer).
 *
 * The snapshot is serialized through the exact same path as `capture`
 * ({@link FieldPermissionConfigSerializer}) so the state file is round-trip
 * compatible with the captured config. The app revision is NOT written here; it
 * is persisted separately via `AppRevisionStorage` (ADR-188-001).
 */
export const FieldPermissionStateSerializer = {
  serialize: (state: FieldPermissionState): Record<string, unknown> =>
    FieldPermissionConfigSerializer.serialize(state.config),
};
