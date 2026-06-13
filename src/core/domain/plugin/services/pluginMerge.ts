import {
  computeRecordThreeWayMerge,
  type RecordMergeResolution,
  type RecordThreeWayMerge,
  resolveRecordMerge,
} from "../../recordMerge";
import type { PluginConfig, PluginsConfig } from "../entity";
import { PluginErrorCode } from "../errorCode";

/**
 * 3-way merge for the plugin domain (plugin id keyed).
 *
 * Plugins are keyed by `id`, so this reuses the record-keyed primitive. The
 * `eq` matches the 2-way `PluginDiffDetector`: `name` and `enabled` are
 * compared (the `id` is the record key and is not compared here). Each plugin
 * is classified independently, preserving the per-entry granularity of
 * `plugin diff`.
 *
 * NOTE: the merge classification is identical to the other record-keyed
 * domains; the plugin-specific API constraint (add-only — deletions and
 * disables cannot be applied via `addPlugins`) is enforced in the application
 * layer (`pushPlugin`), not here.
 */
export function isPluginConfigEqual(a: PluginConfig, b: PluginConfig): boolean {
  return a.name === b.name && a.enabled === b.enabled;
}

function toRecord(
  config: PluginsConfig,
): Readonly<Record<string, PluginConfig>> {
  const record: Record<string, PluginConfig> = {};
  for (const plugin of config.plugins) {
    record[plugin.id] = plugin;
  }
  return record;
}

export type PluginThreeWayMerge = RecordThreeWayMerge<PluginConfig>;

/** Computes the record-keyed 3-way merge of base/local/remote plugins. */
export function computePluginThreeWayMerge(
  base: PluginsConfig,
  local: PluginsConfig,
  remote: PluginsConfig,
): PluginThreeWayMerge {
  return computeRecordThreeWayMerge(
    toRecord(base),
    toRecord(local),
    toRecord(remote),
    isPluginConfigEqual,
  );
}

export type PluginMergeResolution = RecordMergeResolution;

/**
 * Applies a resolved 3-way merge, returning the merged plugins config. The
 * merged record is flattened back into a `plugins` list. Throws a
 * BusinessRuleError when a conflict is left unresolved (programmer invariant).
 */
export function resolvePluginMerge(
  merge: PluginThreeWayMerge,
  resolution: PluginMergeResolution,
): PluginsConfig {
  const record = resolveRecordMerge(
    merge,
    resolution,
    PluginErrorCode.PlUnresolvedConflict,
  );
  return { plugins: Object.values(record) };
}
