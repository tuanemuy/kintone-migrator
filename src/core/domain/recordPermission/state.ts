import type { RecordPermissionConfig } from "./entity";

/**
 * Base snapshot used as the common ancestor for 3-way merge (ADR-188-001 /
 * ADR-188-016).
 *
 * A `RecordPermissionState` is the record permission config at the time the
 * local YAML was last synchronized with the remote app. It is persisted to a
 * state file (`state/<appName>/record-acl.yaml`) by `record-acl pull` /
 * `record-acl push` and used by `record-acl diff` / `record-acl push` to detect
 * drift.
 *
 * The app (preview) revision is NOT stored here: revision is an app-scoped value
 * managed separately in `state/<appName>/revision.yaml` via `AppRevisionStorage`.
 * The snapshot YAML is the same format as `capture`, so the capture
 * serializer/parser are reused for round-trip compatibility.
 */
export type RecordPermissionState = Readonly<{
  /** The base snapshot of the record permission config. */
  config: RecordPermissionConfig;
}>;
