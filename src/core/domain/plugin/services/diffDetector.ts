import { buildDiffResult } from "../../diff";
import type { PluginsConfig } from "../entity";
import type { PluginDiffEntry } from "../valueObject";

export const PluginDiffDetector = {
  detect: (local: PluginsConfig, remote: PluginsConfig) => {
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
      } else {
        const diffs: string[] = [];
        if (localPlugin.name !== remotePlugin.name) {
          diffs.push(`name: "${remotePlugin.name}" -> "${localPlugin.name}"`);
        }
        if (localPlugin.enabled !== remotePlugin.enabled) {
          diffs.push(
            `enabled: ${String(remotePlugin.enabled)} -> ${String(localPlugin.enabled)}`,
          );
        }
        if (diffs.length > 0) {
          entries.push({
            type: "modified",
            pluginId: id,
            details: diffs.join(", "),
          });
        }
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

    return buildDiffResult(entries);
  },
};
