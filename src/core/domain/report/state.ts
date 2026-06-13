import type { ReportsConfig } from "./entity";

/**
 * Base snapshot used as the common ancestor for 3-way merge (ADR-188-001).
 *
 * A `ReportState` is the reports config at the time the local YAML was last
 * synchronized with the remote app. It is persisted to a state file
 * (`state/<appName>/report.yaml`) by `report pull` / `report push` and used by
 * `report diff` / `report push` to detect drift.
 *
 * The app (preview) revision is NOT stored here: revision is an app-scoped
 * value managed separately in `state/<appName>/revision.yaml` via
 * `AppRevisionStorage`. The snapshot YAML is the same format as `capture`, so
 * the capture serializer/parser are reused for round-trip compatibility.
 */
export type ReportState = Readonly<{
  /** The base snapshot of the reports config. */
  config: ReportsConfig;
}>;
