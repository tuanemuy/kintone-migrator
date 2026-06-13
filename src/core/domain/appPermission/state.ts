import type { AppPermissionConfig } from "./entity";

/**
 * Base snapshot used as the common ancestor for 3-way merge (ADR-188-001 /
 * ADR-188-016).
 *
 * An `AppPermissionState` is the app permission config at the time the local
 * YAML was last synchronized with the remote app. It is persisted to a state
 * file (`state/<appName>/app-acl.yaml`) by `app-acl pull` / `app-acl push` and
 * used by `app-acl diff` / `app-acl push` to detect drift.
 *
 * The app (preview) revision is NOT stored here: revision is an app-scoped value
 * managed separately in `state/<appName>/revision.yaml` via `AppRevisionStorage`.
 * The snapshot YAML is the same format as `capture`, so the capture
 * serializer/parser are reused for round-trip compatibility.
 */
export type AppPermissionState = Readonly<{
  /** The base snapshot of the app permission config. */
  config: AppPermissionConfig;
}>;
