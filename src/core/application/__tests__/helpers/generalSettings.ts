import type { GeneralSettingsContainer } from "@/core/application/container/generalSettings";
import type { GeneralSettingsConfig } from "@/core/domain/generalSettings/entity";
import type { GeneralSettingsConfigurator } from "@/core/domain/generalSettings/ports/generalSettingsConfigurator";
import type { GeneralSettingsStorage } from "@/core/domain/generalSettings/ports/generalSettingsStorage";
import {
  FakeBase,
  InMemoryAppDeployer,
  InMemoryFileStorage,
  setupContainer,
} from "./shared";

export class InMemoryGeneralSettingsConfigurator
  extends FakeBase
  implements GeneralSettingsConfigurator
{
  private config: GeneralSettingsConfig = {};
  private revision = "1";
  lastUpdateParams: {
    config: GeneralSettingsConfig;
    revision?: string;
  } | null = null;

  async getGeneralSettings(): Promise<{
    config: GeneralSettingsConfig;
    revision: string;
  }> {
    this.record("getGeneralSettings");
    return { config: { ...this.config }, revision: this.revision };
  }

  async updateGeneralSettings(params: {
    config: GeneralSettingsConfig;
    revision?: string;
  }): Promise<{ revision: string }> {
    this.record("updateGeneralSettings");
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
  return setupContainer(createTestGeneralSettingsContainer);
}
