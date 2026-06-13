import type { ProcessManagementConfig } from "./entity";

/**
 * Base snapshot used as the common ancestor for whole-entity 3-way merge
 * (ADR-188-001 / ADR-188-014).
 *
 * A `ProcessManagementState` is the process management config at the time the
 * local YAML was last synchronized with the remote app. It is persisted to a
 * state file (`state/<appName>/process.yaml`) by `process pull` / `process push`
 * and used by `process diff` / `process push` to detect drift.
 *
 * The app (preview) revision is NOT stored here: revision is an app-scoped value
 * managed separately in `state/<appName>/revision.yaml` via `AppRevisionStorage`.
 * The snapshot YAML is the same format as `capture`, so the capture
 * serializer/parser are reused for round-trip compatibility.
 */
export type ProcessManagementState = Readonly<{
  /** The base snapshot of the process management config. */
  config: ProcessManagementConfig;
}>;
