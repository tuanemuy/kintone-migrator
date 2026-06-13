import type { FieldPermissionConfig } from "./entity";

/**
 * Base snapshot used as the common ancestor for 3-way merge (ADR-188-001 /
 * ADR-188-016).
 *
 * A `FieldPermissionState` is the field permission config at the time the local
 * YAML was last synchronized with the remote app. It is persisted to a state
 * file (`state/<appName>/field-acl.yaml`) by `field-acl pull` / `field-acl push`
 * and used by `field-acl diff` / `field-acl push` to detect drift.
 *
 * The app (preview) revision is NOT stored here: revision is an app-scoped value
 * managed separately in `state/<appName>/revision.yaml` via `AppRevisionStorage`.
 * The snapshot YAML is the same format as `capture`, so the capture
 * serializer/parser are reused for round-trip compatibility.
 */
export type FieldPermissionState = Readonly<{
  /** The base snapshot of the field permission config. */
  config: FieldPermissionConfig;
}>;
