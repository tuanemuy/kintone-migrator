import type { Schema } from "./entity";

/**
 * Base snapshot used as the common ancestor for 3-way merge.
 *
 * A `SchemaState` is the form schema (fields + layout) at the time the local
 * YAML was last synchronized with the remote app, together with the app
 * (preview) revision observed at that moment. It is persisted to a state file
 * (see `buildStateFilePath`) by `schema pull` / `schema push` and used by
 * `schema diff` / `schema push` to detect drift.
 */
export type SchemaState = Readonly<{
  /** The app (preview) revision observed when the snapshot was captured. */
  revision: string;
  /** The base snapshot of the form schema. */
  schema: Schema;
}>;
