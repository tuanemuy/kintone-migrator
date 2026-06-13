import type { PluginConfig } from "@/core/domain/plugin/entity";
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

/** A local→remote operation that `addPlugins` cannot express (AC-16). */
export type SkippedPluginOp = Readonly<{
  pluginId: string;
  /**
   * `delete`: the plugin was removed locally but still exists on the remote
   * (`addPlugins` cannot remove). `modify`: name/enabled changed locally but the
   * plugin already exists on the remote (`addPlugins` cannot update; `enabled`
   * is not controllable via the REST API at all).
   */
  reason: "delete" | "modify";
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
 * Applies the local plugin config to the remote with drift detection (AC-8 /
 * AC-16).
 *
 * The plugin API is **add-only**: `addPlugins` can only install a plugin id
 * that is not yet on the app. It has no remove API and cannot control the
 * `enabled` flag (MEMORY: plugin-enabled-no-disable-api). So this push:
 *
 * - Loads base/local/remote and rejects on drift (remoteOnly / conflict) unless
 *   `--force` (ADR-188-006 / AC-10).
 * - Adds only the plugin ids that are present locally but missing on the remote.
 * - Surfaces every requested-but-inexpressible operation (a local deletion of a
 *   remote plugin, or a name/enabled change to an existing plugin) as a
 *   `skipped` warning instead of applying it — the only horizontal AC-16 case.
 *
 * The expected revision (the observed remote revision) is sent to `addPlugins`
 * as a TOCTOU guard on a normal push; `--force` / first run omit it
 * (ADR-188-004). When there is nothing to add, the remote is not touched but
 * the base snapshot is still re-synchronized so the local intent is recorded.
 *
 * The new base snapshot is the **actual post-push remote state**, not `local`
 * (W-app-003): it is the remote plugin set plus the ids actually added. Skipped
 * `modify`/`delete` ops were NOT applied, so the remote keeps its own value;
 * baking `local` into the base would hide those still-pending differences from
 * future drift detection (the snapshot is the drift source of truth, ADR-188-009).
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

  // Add-only: install plugin ids present locally but missing on the remote.
  const idsToAdd = local.plugins
    .filter((p) => !remoteById.has(p.id))
    .map((p) => p.id);

  // Inexpressible operations (AC-16): a remote plugin absent locally cannot be
  // removed, and an existing plugin whose name/enabled differs cannot be
  // modified (no update API; `enabled` is REST-uncontrollable).
  const skipped: SkippedPluginOp[] = [];
  for (const remotePlugin of remote.config.plugins) {
    if (!localById.has(remotePlugin.id)) {
      skipped.push({ pluginId: remotePlugin.id, reason: "delete" });
    }
  }
  for (const localPlugin of local.plugins) {
    const remotePlugin = remoteById.get(localPlugin.id);
    if (
      remotePlugin !== undefined &&
      (remotePlugin.name !== localPlugin.name ||
        remotePlugin.enabled !== localPlugin.enabled)
    ) {
      skipped.push({ pluginId: localPlugin.id, reason: "modify" });
    }
  }

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
  // difference is re-detected as drift on the next push (W-app-003).
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
