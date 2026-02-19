import { beforeEach } from "vitest";
import type { ViewContainer } from "@/core/application/container/view";
import { SystemError, SystemErrorCode } from "@/core/application/error";
import type { ViewConfig } from "@/core/domain/view/entity";
import type { ViewConfigurator } from "@/core/domain/view/ports/viewConfigurator";
import type { ViewStorage } from "@/core/domain/view/ports/viewStorage";
import { InMemoryAppDeployer, InMemoryFileStorage } from "./shared";

export class InMemoryViewConfigurator implements ViewConfigurator {
  private views: Record<string, ViewConfig> = {};
  private revision = "1";
  callLog: string[] = [];
  lastUpdateParams: {
    views: Readonly<Record<string, ViewConfig>>;
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
  let container: TestViewContainer;

  beforeEach(() => {
    container = createTestViewContainer();
  });

  return () => container;
}
