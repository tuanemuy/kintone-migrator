import type { NotificationConfig } from "./entity";

/**
 * Base snapshot used as the common ancestor for 3-way merge (ADR-188-001).
 *
 * A `NotificationState` is the notification config (general / perRecord /
 * reminder bundled into one snapshot) at the time the local YAML was last
 * synchronized with the remote app. It is persisted to a state file
 * (`state/<appName>/notification.yaml`) by `notification pull` /
 * `notification push` and used by `notification diff` / `notification push` to
 * detect drift.
 *
 * The three sub-configs are bundled here even though kintone updates them via
 * three independent APIs, because they share a single app-scoped revision
 * (ADR-188-001 / ADR-188-004). The app (preview) revision is NOT stored here:
 * it lives in `state/<appName>/revision.yaml` via `AppRevisionStorage`. The
 * snapshot YAML is the same format as `capture`, so the capture
 * serializer/parser are reused for round-trip compatibility.
 */
export type NotificationState = Readonly<{
  /** The base snapshot of the notification config (3 sub-configs bundled). */
  config: NotificationConfig;
}>;
