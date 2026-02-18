import type { PluginConfigurator } from "@/core/domain/plugin/ports/pluginConfigurator";
import type { PluginStorage } from "@/core/domain/plugin/ports/pluginStorage";
import type { AppDeployer } from "@/core/domain/ports/appDeployer";
import type { ServiceArgs } from "../types";

export type PluginContainer = {
  pluginConfigurator: PluginConfigurator;
  pluginStorage: PluginStorage;
  appDeployer: AppDeployer;
};

export type PluginServiceArgs<T = undefined> = ServiceArgs<PluginContainer, T>;
