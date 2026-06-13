import type { ActionsConfig } from "./entity";

/**
 * Base snapshot used as the common ancestor for 3-way merge (ADR-188-001).
 *
 * An `ActionState` is the actions config at the time the local YAML was last
 * synchronized with the remote app. It is persisted to a state file
 * (`state/<appName>/action.yaml`) by `action pull` / `action push` and used by
 * `action diff` / `action push` to detect drift.
 *
 * The app (preview) revision is NOT stored here: revision is an app-scoped
 * value managed separately in `state/<appName>/revision.yaml` via
 * `AppRevisionStorage`. The snapshot YAML is the same format as `capture`, so
 * the capture serializer/parser are reused for round-trip compatibility.
 */
export type ActionState = Readonly<{
  /** The base snapshot of the actions config. */
  config: ActionsConfig;
}>;
