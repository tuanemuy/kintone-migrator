import type { PluginsConfig } from "./entity";

/**
 * Base snapshot used as the common ancestor for 3-way merge.
 *
 * A `PluginState` is the plugins config at the time the local YAML was last
 * synchronized with the remote app. It is persisted to a state file
 * (`state/<appName>/plugin.yaml`) by `plugin pull` / `plugin push` and used by
 * `plugin diff` / `plugin push` to detect drift.
 *
 * The app (preview) revision is NOT stored here: revision is an app-scoped value
 * managed separately in `state/<appName>/revision.yaml` via `AppRevisionStorage`.
 * The snapshot YAML is the same format as `capture`, so the capture
 * serializer/parser are reused for round-trip compatibility.
 */
export type PluginState = Readonly<{
  /** The base snapshot of the plugins config. */
  config: PluginsConfig;
}>;
