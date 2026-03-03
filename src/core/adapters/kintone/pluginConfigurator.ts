import type { KintoneRestAPIClient } from "@kintone/rest-api-client";
import type { PluginConfig } from "@/core/domain/plugin/entity";
import type { PluginConfigurator } from "@/core/domain/plugin/ports/pluginConfigurator";
import { wrapKintoneError } from "./wrapKintoneError";

export class KintonePluginConfigurator implements PluginConfigurator {
  constructor(
    private readonly client: KintoneRestAPIClient,
    private readonly appId: string,
  ) {}

  async getPlugins(): Promise<{
    plugins: readonly PluginConfig[];
    revision: string;
  }> {
    try {
      const response = await this.client.app.getPlugins({
        app: this.appId,
        preview: true,
      });

      const plugins = response.plugins.map(
        (raw): PluginConfig => ({
          id: raw.id,
          name: raw.name,
          enabled: raw.enabled,
        }),
      );

      return {
        plugins,
        revision: response.revision,
      };
    } catch (error) {
      wrapKintoneError(error, "Failed to get plugins");
    }
  }

  async addPlugins(params: {
    ids: readonly string[];
    revision?: string;
  }): Promise<{ revision: string }> {
    try {
      const result = await this.client.app.addPlugins({
        app: this.appId,
        ids: [...params.ids],
        revision: params.revision,
      });
      return { revision: result.revision };
    } catch (error) {
      wrapKintoneError(error, "Failed to add plugins");
    }
  }
}
