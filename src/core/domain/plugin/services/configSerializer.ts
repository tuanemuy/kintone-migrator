import { serializeToYaml } from "@/core/domain/services/yamlConfigSerializer";
import type { PluginsConfig } from "../entity";

export const PluginConfigSerializer = {
  serialize: (config: PluginsConfig): string => {
    const serialized = {
      plugins: config.plugins.map((plugin) => ({
        id: plugin.id,
        name: plugin.name,
        enabled: plugin.enabled,
      })),
    };

    return serializeToYaml(serialized);
  },
};
