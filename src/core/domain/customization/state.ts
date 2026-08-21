import type { CustomizationConfig } from "./entity";
import type { CustomizationFileDigests } from "./valueObject";

/**
 * Base snapshot used as the common ancestor for 3-way merge.
 *
 * A `CustomizationState` is the customization config (scope + each platform's
 * js/css resource lists) at the time the local YAML was last synchronized with
 * the remote app, together with the content digest of each FILE resource. It is
 * persisted to a state file (`state/<appName>/customize.yaml`) by
 * `customize pull` / `customize push` and used by `customize diff` /
 * `customize push` to detect drift.
 *
 * File *contents* are not stored — only their digests, which is all the merge
 * needs to tell "local moved away from base" from "remote moved away from
 * base". Conflicts stay file-unit (the whole file is taken from one side), not
 * line-level. A FILE resource with no recorded digest is *untracked*: its
 * content at snapshot time is unknown and the merge falls back to inference.
 * The app (preview) revision is NOT stored here; it is managed separately in
 * `state/<appName>/revision.yaml` via `AppRevisionStorage`. The snapshot YAML is
 * the same format as `capture`, plus the per-FILE `digest` key.
 */
export type CustomizationState = Readonly<{
  /** The base snapshot of the customization config. */
  config: CustomizationConfig;
  /**
   * Content digests of the snapshot's FILE resources, keyed by
   * `resourceKey(platform, category, basename)`. Keys are a subset of the FILE
   * resources in `config`; URL resources never carry a digest.
   */
  fileDigests: CustomizationFileDigests;
}>;
