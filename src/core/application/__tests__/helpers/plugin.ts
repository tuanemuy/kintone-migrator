import type { PluginContainer } from "@/core/application/container/plugin";
import type { PluginConfig } from "@/core/domain/plugin/entity";
import type { PluginConfigurator } from "@/core/domain/plugin/ports/pluginConfigurator";
import type { PluginStorage } from "@/core/domain/plugin/ports/pluginStorage";
import {
  FakeBase,
  InMemoryAppDeployer,
  InMemoryFileStorage,
  setupContainer,
} from "./shared";

export class InMemoryPluginConfigurator
  extends FakeBase
  implements PluginConfigurator
{
  private plugins: readonly PluginConfig[] = [];
  private revision = "1";
  lastAddPluginsParams: { ids: readonly string[]; revision?: string } | null =
    null;

  async getPlugins(): Promise<{
    plugins: readonly PluginConfig[];
    revision: string;
  }> {
    this.record("getPlugins");
    return { plugins: [...this.plugins], revision: this.revision };
  }

  async addPlugins(params: {
    ids: readonly string[];
    revision?: string;
  }): Promise<{ revision: string }> {
    this.record("addPlugins");
    this.lastAddPluginsParams = params;
    const newRevision = String(Number(this.revision) + 1);
    this.revision = newRevision;
    return { revision: newRevision };
  }

  setPlugins(plugins: readonly PluginConfig[], revision?: string): void {
    this.plugins = [...plugins];
    if (revision !== undefined) this.revision = revision;
  }
}

export class InMemoryPluginStorage
  extends InMemoryFileStorage
  implements PluginStorage {}

export type TestPluginContainer = PluginContainer & {
  pluginConfigurator: InMemoryPluginConfigurator;
  pluginStorage: InMemoryPluginStorage;
  appDeployer: InMemoryAppDeployer;
};

export function createTestPluginContainer(): TestPluginContainer {
  return {
    pluginConfigurator: new InMemoryPluginConfigurator(),
    pluginStorage: new InMemoryPluginStorage(),
    appDeployer: new InMemoryAppDeployer(),
  };
}

export function setupTestPluginContainer(): () => TestPluginContainer {
  return setupContainer(createTestPluginContainer);
}
