import type { PluginsConfig } from "@/core/domain/plugin/entity";
import { PluginStateParser } from "@/core/domain/plugin/services/pluginStateParser";
import type { PluginDiffContainer } from "../container/plugin";
import {
  loadThreeWayInputs,
  type ThreeWayInputs,
} from "../threeWay/loadThreeWayInputs";
import { parsePluginConfigText } from "./parseConfig";

/** Remote plugins config carrying the revision it was observed at. */
export type PluginRemote = Readonly<{
  config: PluginsConfig;
  revision: string;
}>;

export type PluginThreeWayInputs = ThreeWayInputs<PluginsConfig, PluginRemote>;

/**
 * Loads the four inputs of a 3-way plugin sync (base snapshot, base app
 * revision, local YAML, remote config + revision) via the generic
 * {@link loadThreeWayInputs}. Plugins are keyed by `id` (record-keyed), so it
 * loads thinly on top of the generic helper.
 */
export async function loadPluginThreeWayInputs(
  container: PluginDiffContainer,
): Promise<PluginThreeWayInputs> {
  return loadThreeWayInputs<PluginsConfig, PluginRemote>({
    codec: container.configCodec,
    stateStorage: container.pluginStateStorage,
    appRevisionStorage: container.appRevisionStorage,
    parseState: (parsed) => PluginStateParser.parse(parsed).config,
    stateLabel: "Plugin state",
    loadLocal: async () => {
      const result = await container.pluginStorage.get();
      if (!result.exists) {
        return undefined;
      }
      return parsePluginConfigText(container.configCodec, result.content);
    },
    loadRemote: async () => {
      const { plugins, revision } =
        await container.pluginConfigurator.getPlugins();
      return { config: { plugins }, revision };
    },
  });
}
