import type { ReportState } from "../state";
import { ReportConfigSerializer } from "./configSerializer";

/**
 * Serializes a {@link ReportState} to a plain object suitable for YAML
 * stringification (via the codec port in the application layer).
 *
 * The snapshot is serialized through the exact same path as `capture`
 * ({@link ReportConfigSerializer}) so the state file is round-trip compatible
 * with the captured config. The app revision is NOT written here; it is
 * persisted separately via `AppRevisionStorage` (ADR-188-001).
 */
export const ReportStateSerializer = {
  serialize: (state: ReportState): Record<string, unknown> =>
    ReportConfigSerializer.serialize(state.config),
};
