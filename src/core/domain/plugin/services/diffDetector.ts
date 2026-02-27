import type { PluginsConfig } from "../entity";
import type { PluginDiff, PluginDiffEntry } from "../valueObject";

export const PluginDiffDetector = {
  detect: (local: PluginsConfig, remote: PluginsConfig): PluginDiff => {
    const entries: PluginDiffEntry[] = [];

    const localMap = new Map(local.plugins.map((p) => [p.id, p]));
    const remoteMap = new Map(remote.plugins.map((p) => [p.id, p]));

    for (const [id, localPlugin] of localMap) {
      const remotePlugin = remoteMap.get(id);
      if (!remotePlugin) {
        entries.push({
          type: "added",
          pluginId: id,
          details: `"${localPlugin.name}"`,
        });
      } else if (localPlugin.enabled !== remotePlugin.enabled) {
        entries.push({
          type: "modified",
          pluginId: id,
          details: `enabled: ${String(remotePlugin.enabled)} -> ${String(localPlugin.enabled)}`,
        });
      }
    }

    for (const [id, remotePlugin] of remoteMap) {
      if (!localMap.has(id)) {
        entries.push({
          type: "deleted",
          pluginId: id,
          details: `"${remotePlugin.name}"`,
        });
      }
    }

    const added = entries.filter((e) => e.type === "added").length;
    const modified = entries.filter((e) => e.type === "modified").length;
    const deleted = entries.filter((e) => e.type === "deleted").length;

    return {
      entries,
      summary: { added, modified, deleted, total: added + modified + deleted },
      isEmpty: entries.length === 0,
    };
  },
};
