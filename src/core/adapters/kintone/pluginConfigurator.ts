import type { KintoneRestAPIClient } from "@kintone/rest-api-client";
import { SystemError, SystemErrorCode } from "@/core/application/error";
import { isBusinessRuleError } from "@/core/domain/error";
import type { PluginConfig } from "@/core/domain/plugin/entity";
import type { PluginConfigurator } from "@/core/domain/plugin/ports/pluginConfigurator";

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
      if (isBusinessRuleError(error)) throw error;
      if (error instanceof SystemError) throw error;
      throw new SystemError(
        SystemErrorCode.ExternalApiError,
        "Failed to get plugins",
        error,
      );
    }
  }

  async addPlugins(params: {
    ids: readonly string[];
    revision?: string;
  }): Promise<{ revision: string }> {
    try {
      const result = await this.client.app.addPlugins({
        app: this.appId,
        ids: params.ids as string[],
        revision: params.revision,
      });
      return { revision: result.revision };
    } catch (error) {
      if (isBusinessRuleError(error)) throw error;
      if (error instanceof SystemError) throw error;
      throw new SystemError(
        SystemErrorCode.ExternalApiError,
        "Failed to add plugins",
        error,
      );
    }
  }
}
