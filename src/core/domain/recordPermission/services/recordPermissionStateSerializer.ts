import type { RecordPermissionState } from "../state";
import { RecordPermissionConfigSerializer } from "./configSerializer";

/**
 * Serializes a {@link RecordPermissionState} to a plain object suitable for YAML
 * stringification (via the codec port in the application layer).
 *
 * The snapshot is serialized through the exact same path as `capture`
 * ({@link RecordPermissionConfigSerializer}) so the state file is round-trip
 * compatible with the captured config. The app revision is NOT written here; it
 * is persisted separately via `AppRevisionStorage` (ADR-188-001).
 */
export const RecordPermissionStateSerializer = {
  serialize: (state: RecordPermissionState): Record<string, unknown> =>
    RecordPermissionConfigSerializer.serialize(state.config),
};
