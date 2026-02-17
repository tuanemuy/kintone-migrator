import type { PluginConfigurator } from "@/core/domain/plugin/ports/pluginConfigurator";
import type { PluginStorage } from "@/core/domain/plugin/ports/pluginStorage";
import type { AppDeployer } from "@/core/domain/ports/appDeployer";

export type PluginContainer = {
  pluginConfigurator: PluginConfigurator;
  pluginStorage: PluginStorage;
  appDeployer: AppDeployer;
};

export type PluginServiceArgs<T = undefined> = T extends undefined
  ? { container: PluginContainer }
  : { container: PluginContainer; input: T };
