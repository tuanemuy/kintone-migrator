import type { CustomizationConfig } from "./entity";

/**
 * Base snapshot used as the common ancestor for 3-way merge (ADR-188-001 /
 * AC-9).
 *
 * A `CustomizationState` is the customization config (scope + each platform's
 * js/css resource lists) at the time the local YAML was last synchronized with
 * the remote app. It is persisted to a state file
 * (`state/<appName>/customize.yaml`) by `customize pull` / `customize push` and
 * used by `customize diff` / `customize push` to detect drift.
 *
 * Only the resource list (file names / URLs) is recorded here, not file
 * *contents*: the 3-way merge is by file name, and same-name file-content
 * conflicts are detected at pull/push time by comparing local vs remote content
 * (file-unit conflict, not line-level — #175 scope). The app (preview) revision
 * is NOT stored here; it is managed separately in `state/<appName>/revision.yaml`
 * via `AppRevisionStorage`. The snapshot YAML is the same format as `capture`.
 */
export type CustomizationState = Readonly<{
  /** The base snapshot of the customization config. */
  config: CustomizationConfig;
}>;
