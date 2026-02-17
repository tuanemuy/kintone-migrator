import { stringify as stringifyYaml } from "yaml";
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

    return stringifyYaml(serialized, {
      lineWidth: 0,
      defaultKeyType: "PLAIN",
      defaultStringType: "PLAIN",
    });
  },
};
