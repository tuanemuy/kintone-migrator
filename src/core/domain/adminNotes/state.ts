import type { AdminNotesConfig } from "./entity";

/**
 * Base snapshot used as the common ancestor for whole-entity 3-way merge
 * (ADR-188-001 / ADR-188-014).
 *
 * An `AdminNotesState` is the admin notes config at the time the local YAML was
 * last synchronized with the remote app. It is persisted to a state file
 * (`state/<appName>/admin-notes.yaml`) by `admin-notes pull` / `admin-notes
 * push` and used by `admin-notes diff` / `admin-notes push` to detect drift.
 *
 * The app (preview) revision is NOT stored here: revision is an app-scoped value
 * managed separately in `state/<appName>/revision.yaml` via `AppRevisionStorage`.
 * The snapshot YAML is the same format as `capture`, so the capture
 * serializer/parser are reused for round-trip compatibility.
 */
export type AdminNotesState = Readonly<{
  /** The base snapshot of the admin notes config. */
  config: AdminNotesConfig;
}>;
