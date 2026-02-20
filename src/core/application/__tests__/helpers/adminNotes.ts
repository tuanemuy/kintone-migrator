import type { AdminNotesContainer } from "@/core/application/container/adminNotes";
import type { AdminNotesConfig } from "@/core/domain/adminNotes/entity";
import type { AdminNotesConfigurator } from "@/core/domain/adminNotes/ports/adminNotesConfigurator";
import type { AdminNotesStorage } from "@/core/domain/adminNotes/ports/adminNotesStorage";
import {
  InMemoryAppDeployer,
  InMemoryFileStorage,
  setupContainer,
  TestDouble,
} from "./shared";

export class InMemoryAdminNotesConfigurator
  extends TestDouble
  implements AdminNotesConfigurator
{
  private config: AdminNotesConfig = {
    content: "",
    includeInTemplateAndDuplicates: false,
  };
  private revision = "1";
  lastUpdateParams: {
    config: AdminNotesConfig;
    revision?: string;
  } | null = null;

  async getAdminNotes(): Promise<{
    config: AdminNotesConfig;
    revision: string;
  }> {
    this.callLog.push("getAdminNotes");
    this.checkFail("getAdminNotes");
    return { config: { ...this.config }, revision: this.revision };
  }

  async updateAdminNotes(params: {
    config: AdminNotesConfig;
    revision?: string;
  }): Promise<{ revision: string }> {
    this.callLog.push("updateAdminNotes");
    this.checkFail("updateAdminNotes");
    this.lastUpdateParams = params;
    const newRevision = String(Number(this.revision) + 1);
    this.revision = newRevision;
    return { revision: newRevision };
  }

  setConfig(config: AdminNotesConfig, revision?: string): void {
    this.config = { ...config };
    if (revision !== undefined) this.revision = revision;
  }
}

export class InMemoryAdminNotesStorage
  extends InMemoryFileStorage
  implements AdminNotesStorage {}

export type TestAdminNotesContainer = AdminNotesContainer & {
  adminNotesConfigurator: InMemoryAdminNotesConfigurator;
  adminNotesStorage: InMemoryAdminNotesStorage;
  appDeployer: InMemoryAppDeployer;
};

export function createTestAdminNotesContainer(): TestAdminNotesContainer {
  return {
    adminNotesConfigurator: new InMemoryAdminNotesConfigurator(),
    adminNotesStorage: new InMemoryAdminNotesStorage(),
    appDeployer: new InMemoryAppDeployer(),
  };
}

export function setupTestAdminNotesContainer(): () => TestAdminNotesContainer {
  return setupContainer(createTestAdminNotesContainer);
}
