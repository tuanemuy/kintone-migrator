import type { ViewsConfig } from "./entity";

/**
 * Base snapshot used as the common ancestor for 3-way merge (ADR-188-001).
 *
 * A `ViewState` is the views config at the time the local YAML was last
 * synchronized with the remote app. It is persisted to a state file
 * (`state/<appName>/view.yaml`) by `view pull` / `view push` and used by
 * `view diff` / `view push` to detect drift.
 *
 * The app (preview) revision is NOT stored here: revision is an app-scoped
 * value managed separately in `state/<appName>/revision.yaml` via
 * `AppRevisionStorage`. The snapshot YAML is the same format as `capture`, so
 * the capture serializer/parser are reused for round-trip compatibility.
 */
export type ViewState = Readonly<{
  /** The base snapshot of the views config. */
  config: ViewsConfig;
}>;
