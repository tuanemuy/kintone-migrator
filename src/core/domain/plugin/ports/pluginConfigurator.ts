import type { PluginConfig } from "../entity";

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
