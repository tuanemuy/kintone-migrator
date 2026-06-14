import type { PluginConfig, PluginsConfig } from "@/core/domain/plugin/entity";
import { computePluginThreeWayMerge } from "@/core/domain/plugin/services/pluginMerge";
import type { PluginServiceArgs } from "../container/plugin";
import { ValidationError, ValidationErrorCode } from "../error";
import { buildDriftConflict } from "../threeWay/driftConflict";
import { loadPluginThreeWayInputs } from "./loadPluginThreeWayInputs";
import { savePluginSnapshotAndRevision } from "./pluginStateIo";

export type PushPluginInput = {
  /** Skip drift checking and send no expected revision (revision-skip). */
  readonly force?: boolean;
};

/** A local→remote operation that `addPlugins` cannot express. */
export type SkippedPluginOp = Readonly<{
  pluginId: string;
  /**
   * `delete`: the plugin was removed locally but still exists on the remote
   * (`addPlugins` cannot remove). `modify`: name/enabled changed locally but the
   * plugin already exists on the remote (`addPlugins` cannot update; `enabled`
   * is not controllable via the REST API at all). `add-disabled`: the plugin is
   * `enabled: false` locally and missing on the remote — `addPlugins` would
   * force-enable it (it cannot add in a disabled state), so it is left
   * uninstalled and the disabled state must be set manually in the kintone
   * admin UI.
   */
  reason: "delete" | "modify" | "add-disabled";
}>;

export type PushPluginOutput = {
  readonly mode: "push" | "firstTime";
  readonly revision: string;
  /** Plugin ids actually added to the remote. */
  readonly addedPluginIds: readonly string[];
  /** Operations that `addPlugins` could not express (surfaced as warnings). */
  readonly skipped: readonly SkippedPluginOp[];
};

/** Pull command name surfaced in the drift hint message. */
const PLUGIN_PULL_COMMAND = "plugin pull";

/**
 * Splits the local→remote diff into the ids that can actually be added
 * (`enabled: true`, missing on the remote) and the inexpressible ops surfaced
 * as `skipped`: `add-disabled` (`enabled: false`, missing), `delete` (remote
 * plugin absent locally), and `modify` (existing plugin with name/enabled
 * change).
 */
function partitionPushOps(
  local: PluginsConfig,
  remoteById: ReadonlyMap<string, PluginConfig>,
  localById: ReadonlyMap<string, PluginConfig>,
  remotePlugins: readonly PluginConfig[],
): { idsToAdd: string[]; skipped: SkippedPluginOp[] } {
  const idsToAdd: string[] = [];
  const skipped: SkippedPluginOp[] = [];

  for (const localPlugin of local.plugins) {
    const remotePlugin = remoteById.get(localPlugin.id);
    if (remotePlugin === undefined) {
      // Add-only: `enabled: false` cannot be added in a disabled state
      // (addPlugins would force-enable it), so skip it as `add-disabled`.
      if (localPlugin.enabled) {
        idsToAdd.push(localPlugin.id);
      } else {
        skipped.push({ pluginId: localPlugin.id, reason: "add-disabled" });
      }
    } else if (
      remotePlugin.name !== localPlugin.name ||
      remotePlugin.enabled !== localPlugin.enabled
    ) {
      // An existing plugin whose name/enabled differs cannot be modified
      // (no update API; `enabled` is REST-uncontrollable).
      skipped.push({ pluginId: localPlugin.id, reason: "modify" });
    }
  }

  // A remote plugin absent locally cannot be removed (no remove API).
  for (const remotePlugin of remotePlugins) {
    if (!localById.has(remotePlugin.id)) {
      skipped.push({ pluginId: remotePlugin.id, reason: "delete" });
    }
  }

  return { idsToAdd, skipped };
}

/**
 * Applies the local plugin config to the remote with drift detection.
 *
 * The plugin API is **add-only**: `addPlugins` can only install a plugin id
 * that is not yet on the app. It has no remove API and cannot control the
 * `enabled` flag (MEMORY: plugin-enabled-no-disable-api). So this push:
 *
 * - Loads base/local/remote and rejects on drift (remoteOnly / conflict) unless
 *   `--force`.
 * - Adds only the `enabled: true` plugin ids that are present locally but
 *   missing on the remote.
 * - Surfaces every requested-but-inexpressible operation as a `skipped` warning
 *   instead of applying it: a local deletion of a remote plugin (`delete`), a
 *   name/enabled change to an existing plugin (`modify`), and an `enabled: false`
 *   plugin missing on the remote (`add-disabled`, since `addPlugins` would
 *   force-enable it).
 *
 * The expected revision (the observed remote revision) is sent to `addPlugins`
 * as a TOCTOU guard on a normal push; `--force` / first run omit it. When there is nothing to add, the remote is not touched but
 * the base snapshot is still re-synchronized so the local intent is recorded.
 *
 * The new base snapshot is the **actual post-push remote state**, not `local`: it is the remote plugin set plus the ids actually added. Skipped
 * `modify`/`delete` ops were NOT applied, so the remote keeps its own value;
 * baking `local` into the base would hide those still-pending differences from
 * future drift detection (the snapshot is the drift source of truth).
 */
export async function pushPlugin({
  container,
  input,
}: PluginServiceArgs<PushPluginInput>): Promise<PushPluginOutput> {
  const { state, local, remote } = await loadPluginThreeWayInputs(container);

  if (local === undefined) {
    throw new ValidationError(
      ValidationErrorCode.InvalidInput,
      "Plugin config file not found",
    );
  }

  const firstTime = state === undefined;

  if (!firstTime && !input.force) {
    const merge = computePluginThreeWayMerge(state, local, remote.config);
    const hasDrift = merge.entries.some(
      (e) => e.change.kind === "remoteOnly" || e.change.kind === "conflict",
    );
    if (hasDrift) {
      throw buildDriftConflict(PLUGIN_PULL_COMMAND);
    }
  }

  const remoteById = new Map<string, PluginConfig>(
    remote.config.plugins.map((p) => [p.id, p]),
  );
  const localById = new Map<string, PluginConfig>(
    local.plugins.map((p) => [p.id, p]),
  );

  const { idsToAdd, skipped } = partitionPushOps(
    local,
    remoteById,
    localById,
    remote.config.plugins,
  );

  let newRevision = remote.revision;
  if (idsToAdd.length > 0) {
    const expectedRevision =
      input.force || firstTime ? undefined : remote.revision;
    const result = await container.pluginConfigurator.addPlugins({
      ids: idsToAdd,
      ...(expectedRevision !== undefined ? { revision: expectedRevision } : {}),
    });
    newRevision = result.revision;
  }

  // New base = the actual post-push remote state: the remote plugins plus the
  // ids we added (which were missing on the remote, so this never duplicates).
  // Skipped modify/delete ops are not applied, so the base keeps the remote's
  // value for them (rather than baking in `local`), so the still-pending
  // difference is re-detected as drift on the next push.
  const newBasePlugins: PluginConfig[] = [
    ...remote.config.plugins,
    ...idsToAdd.flatMap((id) => {
      const p = localById.get(id);
      return p !== undefined ? [p] : [];
    }),
  ];

  await savePluginSnapshotAndRevision(
    container,
    { plugins: newBasePlugins },
    newRevision,
  );

  return {
    mode: firstTime ? "firstTime" : "push",
    revision: newRevision,
    addedPluginIds: idsToAdd,
    skipped,
  };
}
