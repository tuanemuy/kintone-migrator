import type { GeneralSettingsConfig } from "./entity";

/**
 * Base snapshot used as the common ancestor for whole-entity 3-way merge.
 *
 * A `GeneralSettingsState` is the general settings config at the time the local
 * YAML was last synchronized with the remote app. It is persisted to a state
 * file (`state/<appName>/settings.yaml`) by `settings pull` / `settings push`
 * and used by `settings diff` / `settings push` to detect drift.
 *
 * The app (preview) revision is NOT stored here: revision is an app-scoped value
 * managed separately in `state/<appName>/revision.yaml` via `AppRevisionStorage`.
 * The snapshot YAML is the same format as `capture`, so the capture
 * serializer/parser are reused for round-trip compatibility.
 */
export type GeneralSettingsState = Readonly<{
  /** The base snapshot of the general settings config. */
  config: GeneralSettingsConfig;
}>;
