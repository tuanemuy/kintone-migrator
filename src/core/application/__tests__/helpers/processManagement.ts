import type { ProcessManagementContainer } from "@/core/application/container/processManagement";
import type { ProcessManagementConfig } from "@/core/domain/processManagement/entity";
import type { ProcessManagementConfigurator } from "@/core/domain/processManagement/ports/processManagementConfigurator";
import type { ProcessManagementStorage } from "@/core/domain/processManagement/ports/processManagementStorage";
import {
  FakeBase,
  InMemoryAppDeployer,
  InMemoryFileStorage,
  setupContainer,
} from "./shared";

export class InMemoryProcessManagementConfigurator
  extends FakeBase
  implements ProcessManagementConfigurator
{
  private config: ProcessManagementConfig = {
    enable: false,
    states: {},
    actions: [],
  };
  private revision = "1";
  lastUpdateParams: {
    config: ProcessManagementConfig;
    revision?: string;
  } | null = null;

  async getProcessManagement(): Promise<{
    config: ProcessManagementConfig;
    revision: string;
  }> {
    this.trackCall("getProcessManagement");
    return { config: { ...this.config }, revision: this.revision };
  }

  async updateProcessManagement(params: {
    config: ProcessManagementConfig;
    revision?: string;
  }): Promise<{ revision: string }> {
    this.trackCall("updateProcessManagement");
    this.lastUpdateParams = params;
    const newRevision = String(Number(this.revision) + 1);
    this.revision = newRevision;
    return { revision: newRevision };
  }

  setConfig(config: ProcessManagementConfig, revision?: string): void {
    this.config = config;
    if (revision !== undefined) this.revision = revision;
  }
}

export class InMemoryProcessManagementStorage
  extends InMemoryFileStorage
  implements ProcessManagementStorage {}

export type TestProcessManagementContainer = ProcessManagementContainer & {
  processManagementConfigurator: InMemoryProcessManagementConfigurator;
  processManagementStorage: InMemoryProcessManagementStorage;
  appDeployer: InMemoryAppDeployer;
};

export function createTestProcessManagementContainer(): TestProcessManagementContainer {
  return {
    processManagementConfigurator: new InMemoryProcessManagementConfigurator(),
    processManagementStorage: new InMemoryProcessManagementStorage(),
    appDeployer: new InMemoryAppDeployer(),
  };
}

export function setupTestProcessManagementContainer(): () => TestProcessManagementContainer {
  return setupContainer(createTestProcessManagementContainer);
}
