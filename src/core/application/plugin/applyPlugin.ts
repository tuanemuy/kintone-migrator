import type { PluginConfig } from "@/core/domain/plugin/entity";
import type { PluginServiceArgs } from "../container/plugin";
import { ValidationError, ValidationErrorCode } from "../error";
import { parsePluginConfigText } from "./parseConfig";

/** A plugin that apply cannot bring to its desired `enabled: false` state. */
export type SkippedPlugin = Readonly<{
  pluginId: string;
  /**
   * `disabled`: the plugin is `enabled: false` locally but the kintone plugin
   * API cannot express it — there is no way to add a plugin in a disabled state
   * and no way to disable an already-added plugin. Manual action in the kintone
   * admin UI is required.
   */
  reason: "disabled";
}>;

export type ApplyPluginOutput = Readonly<{
  /** Plugin ids actually added to the app. */
  addedPluginIds: readonly string[];
  /** `enabled: false` plugins that need manual handling (surfaced as warnings). */
  skipped: readonly SkippedPlugin[];
}>;

export async function applyPlugin({
  container,
}: PluginServiceArgs): Promise<ApplyPluginOutput> {
  const result = await container.pluginStorage.get();
  if (!result.exists) {
    throw new ValidationError(
      ValidationErrorCode.InvalidInput,
      "Plugin config file not found",
    );
  }
  const config = parsePluginConfigText(container.configCodec, result.content);

  const current = await container.pluginConfigurator.getPlugins();

  const remoteById = new Map<string, PluginConfig>(
    current.plugins.map((p) => [p.id, p]),
  );

  const idsToAdd: string[] = [];
  const skipped: SkippedPlugin[] = [];
  for (const plugin of config.plugins) {
    const remote = remoteById.get(plugin.id);
    if (plugin.enabled) {
      if (remote === undefined) {
        idsToAdd.push(plugin.id);
      }
    } else {
      // enabled: false is inexpressible via the plugin API. Warn unless the
      // remote is already in the intended (disabled) state.
      if (remote === undefined || remote.enabled) {
        skipped.push({ pluginId: plugin.id, reason: "disabled" });
      }
    }
  }

  if (idsToAdd.length > 0) {
    await container.pluginConfigurator.addPlugins({
      ids: idsToAdd,
      revision: current.revision,
    });
  }

  return { addedPluginIds: idsToAdd, skipped };
}
