import type { ViewContainer } from "@/core/application/container/view";
import type { ViewConfig } from "@/core/domain/view/entity";
import type { ViewConfigurator } from "@/core/domain/view/ports/viewConfigurator";
import type { ViewStorage } from "@/core/domain/view/ports/viewStorage";
import {
  InMemoryAppDeployer,
  InMemoryFileStorage,
  setupContainer,
  TestDouble,
} from "./shared";

export class InMemoryViewConfigurator
  extends TestDouble
  implements ViewConfigurator
{
  private views: Record<string, ViewConfig> = {};
  private revision = "1";
  lastUpdateParams: {
    views: Readonly<Record<string, ViewConfig>>;
    revision?: string;
  } | null = null;

  async getViews(): Promise<{
    views: Readonly<Record<string, ViewConfig>>;
    revision: string;
  }> {
    this.callLog.push("getViews");
    this.checkFail("getViews");
    return { views: { ...this.views }, revision: this.revision };
  }

  async updateViews(params: {
    views: Readonly<Record<string, ViewConfig>>;
    revision?: string;
  }): Promise<{ revision: string }> {
    this.callLog.push("updateViews");
    this.checkFail("updateViews");
    this.lastUpdateParams = params;
    const newRevision = String(Number(this.revision) + 1);
    this.revision = newRevision;
    return { revision: newRevision };
  }

  setViews(views: Record<string, ViewConfig>, revision?: string): void {
    this.views = { ...views };
    if (revision !== undefined) this.revision = revision;
  }
}

export class InMemoryViewStorage
  extends InMemoryFileStorage
  implements ViewStorage {}

export type TestViewContainer = ViewContainer & {
  viewConfigurator: InMemoryViewConfigurator;
  viewStorage: InMemoryViewStorage;
  appDeployer: InMemoryAppDeployer;
};

export function createTestViewContainer(): TestViewContainer {
  return {
    viewConfigurator: new InMemoryViewConfigurator(),
    viewStorage: new InMemoryViewStorage(),
    appDeployer: new InMemoryAppDeployer(),
  };
}

export function setupTestViewContainer(): () => TestViewContainer {
  return setupContainer(createTestViewContainer);
}
