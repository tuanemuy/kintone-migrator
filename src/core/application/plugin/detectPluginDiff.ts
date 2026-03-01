import { PluginDiffDetector } from "@/core/domain/plugin/services/diffDetector";
import type { PluginDiff } from "@/core/domain/plugin/valueObject";

export type { PluginDiffEntry } from "@/core/domain/plugin/valueObject";

import type { PluginDiffServiceArgs } from "../container/plugin";
import { detectDiffFromConfig } from "../detectDiffBase";
import { parsePluginConfigText } from "./parseConfig";

export async function detectPluginDiff({
  container,
}: PluginDiffServiceArgs): Promise<PluginDiff> {
  return detectDiffFromConfig({
    getStorage: () => container.pluginStorage.get(),
    fetchRemote: () => container.pluginConfigurator.getPlugins(),
    parseConfig: parsePluginConfigText,
    detect: (local, remote) =>
      PluginDiffDetector.detect(local, { plugins: remote.plugins }),
    notFoundMessage: "Plugin config file not found",
  });
}
