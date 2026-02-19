import { beforeEach } from "vitest";
import type { PluginContainer } from "@/core/application/container/plugin";
import { SystemError, SystemErrorCode } from "@/core/application/error";
import type { PluginConfig } from "@/core/domain/plugin/entity";
import type { PluginConfigurator } from "@/core/domain/plugin/ports/pluginConfigurator";
import type { PluginStorage } from "@/core/domain/plugin/ports/pluginStorage";
import { InMemoryAppDeployer, InMemoryFileStorage } from "./shared";

export class InMemoryPluginConfigurator implements PluginConfigurator {
  private plugins: readonly PluginConfig[] = [];
  private revision = "1";
  callLog: string[] = [];
  lastAddPluginsParams: { ids: readonly string[]; revision?: string } | null =
    null;
  private failOn: Set<string> = new Set();

  setFailOn(methodName: string): void {
    this.failOn.add(methodName);
  }

  private checkFail(methodName: string): void {
    if (this.failOn.has(methodName)) {
      throw new SystemError(
        SystemErrorCode.ExternalApiError,
        `${methodName} failed (test)`,
      );
    }
  }

  async getPlugins(): Promise<{
    plugins: readonly PluginConfig[];
    revision: string;
  }> {
    this.callLog.push("getPlugins");
    this.checkFail("getPlugins");
    return { plugins: [...this.plugins], revision: this.revision };
  }

  async addPlugins(params: {
    ids: readonly string[];
    revision?: string;
  }): Promise<{ revision: string }> {
    this.callLog.push("addPlugins");
    this.checkFail("addPlugins");
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
  let container: TestPluginContainer;

  beforeEach(() => {
    container = createTestPluginContainer();
  });

  return () => container;
}
