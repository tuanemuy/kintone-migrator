import type { Schema } from "./entity";

/**
 * Base snapshot used as the common ancestor for 3-way merge.
 *
 * A `SchemaState` is the form schema (fields + layout) at the time the local
 * YAML was last synchronized with the remote app. It is persisted to a state
 * file (see `buildStateFilePath`) by `schema pull` / `schema push` and used by
 * `schema diff` / `schema push` to detect drift.
 *
 * The app (preview) revision is NOT stored here: revision is an app-scoped
 * value managed separately in `state/<appName>/revision.yaml` via
 * `AppRevisionStorage`. Older state files that still embed a
 * top-level `revision` field are read back compatibly — the field is ignored
 * by {@link SchemaStateParser}.
 */
export type SchemaState = Readonly<{
  /** The base snapshot of the form schema. */
  schema: Schema;
}>;
