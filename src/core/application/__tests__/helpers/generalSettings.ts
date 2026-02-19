import { beforeEach } from "vitest";
import type { GeneralSettingsContainer } from "@/core/application/container/generalSettings";
import { SystemError, SystemErrorCode } from "@/core/application/error";
import type { GeneralSettingsConfig } from "@/core/domain/generalSettings/entity";
import type { GeneralSettingsConfigurator } from "@/core/domain/generalSettings/ports/generalSettingsConfigurator";
import type { GeneralSettingsStorage } from "@/core/domain/generalSettings/ports/generalSettingsStorage";
import { InMemoryAppDeployer, InMemoryFileStorage } from "./shared";

export class InMemoryGeneralSettingsConfigurator
  implements GeneralSettingsConfigurator
{
  private config: GeneralSettingsConfig = {};
  private revision = "1";
  callLog: string[] = [];
  lastUpdateParams: {
    config: GeneralSettingsConfig;
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

  async getGeneralSettings(): Promise<{
    config: GeneralSettingsConfig;
    revision: string;
  }> {
    this.callLog.push("getGeneralSettings");
    this.checkFail("getGeneralSettings");
    return { config: { ...this.config }, revision: this.revision };
  }

  async updateGeneralSettings(params: {
    config: GeneralSettingsConfig;
    revision?: string;
  }): Promise<{ revision: string }> {
    this.callLog.push("updateGeneralSettings");
    this.checkFail("updateGeneralSettings");
    this.lastUpdateParams = params;
    const newRevision = String(Number(this.revision) + 1);
    this.revision = newRevision;
    return { revision: newRevision };
  }

  setConfig(config: GeneralSettingsConfig, revision?: string): void {
    this.config = { ...config };
    if (revision !== undefined) this.revision = revision;
  }
}

export class InMemoryGeneralSettingsStorage
  extends InMemoryFileStorage
  implements GeneralSettingsStorage {}

export type TestGeneralSettingsContainer = GeneralSettingsContainer & {
  generalSettingsConfigurator: InMemoryGeneralSettingsConfigurator;
  generalSettingsStorage: InMemoryGeneralSettingsStorage;
  appDeployer: InMemoryAppDeployer;
};

export function createTestGeneralSettingsContainer(): TestGeneralSettingsContainer {
  return {
    generalSettingsConfigurator: new InMemoryGeneralSettingsConfigurator(),
    generalSettingsStorage: new InMemoryGeneralSettingsStorage(),
    appDeployer: new InMemoryAppDeployer(),
  };
}

export function setupTestGeneralSettingsContainer(): () => TestGeneralSettingsContainer {
  let container: TestGeneralSettingsContainer;

  beforeEach(() => {
    container = createTestGeneralSettingsContainer();
  });

  return () => container;
}
