import type { PluginConfigurator } from "@/core/domain/plugin/ports/pluginConfigurator";
import type { PluginStorage } from "@/core/domain/plugin/ports/pluginStorage";
import type { AppDeployer } from "@/core/domain/ports/appDeployer";
import type { ServiceArgs } from "../types";

export type PluginDiffContainer = {
  pluginConfigurator: PluginConfigurator;
  pluginStorage: PluginStorage;
};

export type PluginContainer = PluginDiffContainer & {
  appDeployer: AppDeployer;
};

export type PluginDiffServiceArgs<T = undefined> = ServiceArgs<
  PluginDiffContainer,
  T
>;

export type PluginServiceArgs<T = undefined> = ServiceArgs<PluginContainer, T>;
