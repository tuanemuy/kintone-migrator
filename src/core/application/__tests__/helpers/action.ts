import type { ActionContainer } from "@/core/application/container/action";
import type { ActionConfig } from "@/core/domain/action/entity";
import type { ActionConfigurator } from "@/core/domain/action/ports/actionConfigurator";
import type { ActionStorage } from "@/core/domain/action/ports/actionStorage";
import {
  InMemoryAppDeployer,
  InMemoryFileStorage,
  setupContainer,
  TestDouble,
} from "./shared";

export class InMemoryActionConfigurator
  extends TestDouble
  implements ActionConfigurator
{
  private actions: Record<string, ActionConfig> = {};
  private revision = "1";
  lastUpdateParams: {
    actions: Readonly<Record<string, ActionConfig>>;
    revision?: string;
  } | null = null;

  async getActions(): Promise<{
    actions: Readonly<Record<string, ActionConfig>>;
    revision: string;
  }> {
    this.callLog.push("getActions");
    this.checkFail("getActions");
    return { actions: { ...this.actions }, revision: this.revision };
  }

  async updateActions(params: {
    actions: Readonly<Record<string, ActionConfig>>;
    revision?: string;
  }): Promise<{ revision: string }> {
    this.callLog.push("updateActions");
    this.checkFail("updateActions");
    this.lastUpdateParams = params;
    const newRevision = String(Number(this.revision) + 1);
    this.revision = newRevision;
    return { revision: newRevision };
  }

  setActions(actions: Record<string, ActionConfig>, revision?: string): void {
    this.actions = { ...actions };
    if (revision !== undefined) this.revision = revision;
  }
}

export class InMemoryActionStorage
  extends InMemoryFileStorage
  implements ActionStorage {}

export type TestActionContainer = ActionContainer & {
  actionConfigurator: InMemoryActionConfigurator;
  actionStorage: InMemoryActionStorage;
  appDeployer: InMemoryAppDeployer;
};

export function createTestActionContainer(): TestActionContainer {
  return {
    actionConfigurator: new InMemoryActionConfigurator(),
    actionStorage: new InMemoryActionStorage(),
    appDeployer: new InMemoryAppDeployer(),
  };
}

export function setupTestActionContainer(): () => TestActionContainer {
  return setupContainer(createTestActionContainer);
}
