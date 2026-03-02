import type { PluginConfig } from "../entity";

// kintone API only supports adding plugins by ID; per-plugin configuration
// (settings JSON) must be applied separately through the plugin's own API.
// The enabled/disabled state cannot be controlled via the REST API.
export interface PluginConfigurator {
  getPlugins(): Promise<{
    plugins: readonly PluginConfig[];
    revision: string;
  }>;
  addPlugins(params: {
    ids: readonly string[];
    revision?: string;
  }): Promise<{ revision: string }>;
}
