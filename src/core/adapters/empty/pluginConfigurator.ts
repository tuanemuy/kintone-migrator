import { SystemError, SystemErrorCode } from "@/core/application/error";
import type { PluginConfig } from "@/core/domain/plugin/entity";
import type { PluginConfigurator } from "@/core/domain/plugin/ports/pluginConfigurator";

export class EmptyPluginConfigurator implements PluginConfigurator {
  async getPlugins(): Promise<{
    plugins: readonly PluginConfig[];
    revision: string;
  }> {
    throw new SystemError(
      SystemErrorCode.InternalServerError,
      "EmptyPluginConfigurator.getPlugins not implemented",
    );
  }

  async addPlugins(_params: {
    ids: readonly string[];
    revision?: string;
  }): Promise<{ revision: string }> {
    throw new SystemError(
      SystemErrorCode.InternalServerError,
      "EmptyPluginConfigurator.addPlugins not implemented",
    );
  }
}
