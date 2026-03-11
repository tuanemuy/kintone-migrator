import type { PluginsConfig } from "../entity";

export const PluginConfigSerializer = {
  serialize: (config: PluginsConfig): Record<string, unknown> => {
    const serialized = {
      plugins: config.plugins.map((plugin) => ({
        id: plugin.id,
        name: plugin.name,
        enabled: plugin.enabled,
      })),
    };

    return serialized;
  },
};
