import { beforeEach } from "vitest";
import type { ProcessManagementContainer } from "@/core/application/container/processManagement";
import { SystemError, SystemErrorCode } from "@/core/application/error";
import type { ProcessManagementConfig } from "@/core/domain/processManagement/entity";
import type { ProcessManagementConfigurator } from "@/core/domain/processManagement/ports/processManagementConfigurator";
import type { ProcessManagementStorage } from "@/core/domain/processManagement/ports/processManagementStorage";
import { InMemoryAppDeployer, InMemoryFileStorage } from "./shared";

export class InMemoryProcessManagementConfigurator
  implements ProcessManagementConfigurator
{
  private config: ProcessManagementConfig = {
    enable: false,
    states: {},
    actions: [],
  };
  private revision = "1";
  callLog: string[] = [];
  lastUpdateParams: {
    config: ProcessManagementConfig;
    revision?: string;
  } | null = null;
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

  async getProcessManagement(): Promise<{
    config: ProcessManagementConfig;
    revision: string;
  }> {
    this.callLog.push("getProcessManagement");
    this.checkFail("getProcessManagement");
    return { config: { ...this.config }, revision: this.revision };
  }

  async updateProcessManagement(params: {
    config: ProcessManagementConfig;
    revision?: string;
  }): Promise<{ revision: string }> {
    this.callLog.push("updateProcessManagement");
    this.checkFail("updateProcessManagement");
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
  let container: TestProcessManagementContainer;

  beforeEach(() => {
    container = createTestProcessManagementContainer();
  });

  return () => container;
}
