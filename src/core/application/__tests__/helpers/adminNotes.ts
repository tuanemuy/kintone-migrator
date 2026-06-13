import type { AdminNotesContainer } from "@/core/application/container/adminNotes";
import type { AdminNotesConfig } from "@/core/domain/adminNotes/entity";
import type { AdminNotesConfigurator } from "@/core/domain/adminNotes/ports/adminNotesConfigurator";
import type { AdminNotesStateStorage } from "@/core/domain/adminNotes/ports/adminNotesStateStorage";
import type { AdminNotesStorage } from "@/core/domain/adminNotes/ports/adminNotesStorage";
import {
  FakeBase,
  InMemoryAppDeployer,
  InMemoryAppRevisionReader,
  InMemoryAppRevisionStorage,
  InMemoryFileStorage,
  setupContainer,
  testConfigCodec,
} from "./shared";

export class InMemoryAdminNotesConfigurator
  extends FakeBase
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
    this.trackCall("getAdminNotes");
    return { config: { ...this.config }, revision: this.revision };
  }

  async updateAdminNotes(params: {
    config: AdminNotesConfig;
    revision?: string;
  }): Promise<{ revision: string }> {
    this.trackCall("updateAdminNotes");
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

export class InMemoryAdminNotesStateStorage
  extends InMemoryFileStorage
  implements AdminNotesStateStorage {}

export type TestAdminNotesContainer = AdminNotesContainer & {
  adminNotesConfigurator: InMemoryAdminNotesConfigurator;
  adminNotesStorage: InMemoryAdminNotesStorage;
  adminNotesStateStorage: InMemoryAdminNotesStateStorage;
  appRevisionStorage: InMemoryAppRevisionStorage;
  appRevisionReader: InMemoryAppRevisionReader;
  appDeployer: InMemoryAppDeployer;
};

export function createTestAdminNotesContainer(): TestAdminNotesContainer {
  return {
    configCodec: testConfigCodec,
    adminNotesConfigurator: new InMemoryAdminNotesConfigurator(),
    adminNotesStorage: new InMemoryAdminNotesStorage(),
    adminNotesStateStorage: new InMemoryAdminNotesStateStorage(),
    appRevisionStorage: new InMemoryAppRevisionStorage(),
    appRevisionReader: new InMemoryAppRevisionReader(),
    appDeployer: new InMemoryAppDeployer(),
  };
}

export function setupTestAdminNotesContainer(): () => TestAdminNotesContainer {
  return setupContainer(createTestAdminNotesContainer);
}
