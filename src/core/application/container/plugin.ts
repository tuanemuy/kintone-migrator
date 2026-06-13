import type { AppRevisionReader } from "@/core/domain/appRevision/ports/appRevisionReader";
import type { AppRevisionStorage } from "@/core/domain/appRevision/ports/appRevisionStorage";
import type { PluginConfigurator } from "@/core/domain/plugin/ports/pluginConfigurator";
import type { PluginStateStorage } from "@/core/domain/plugin/ports/pluginStateStorage";
import type { PluginStorage } from "@/core/domain/plugin/ports/pluginStorage";
import type { AppDeployer } from "@/core/domain/ports/appDeployer";
import type { ConfigCodec } from "@/core/domain/ports/configCodec";
import type { ServiceArgs } from "../types";

export type PluginDiffContainer = {
  configCodec: ConfigCodec;
  pluginConfigurator: PluginConfigurator;
  pluginStorage: PluginStorage;
  // Base snapshot storage for 3-way diff/pull/push (ADR-188-001).
  pluginStateStorage: PluginStateStorage;
  // App-scoped base revision storage (shared across domains, ADR-188-001).
  appRevisionStorage: AppRevisionStorage;
  // Reads the current remote app revision in one place (ADR-188-007).
  appRevisionReader: AppRevisionReader;
};

export type PluginContainer = PluginDiffContainer & {
  appDeployer: AppDeployer;
};

export type PluginDiffServiceArgs<T = undefined> = ServiceArgs<
  PluginDiffContainer,
  T
>;

export type PluginServiceArgs<T = undefined> = ServiceArgs<PluginContainer, T>;
