import { beforeEach } from "vitest";
import type { AdminNotesContainer } from "@/core/application/container/adminNotes";
import { SystemError, SystemErrorCode } from "@/core/application/error";
import type { AdminNotesConfig } from "@/core/domain/adminNotes/entity";
import type { AdminNotesConfigurator } from "@/core/domain/adminNotes/ports/adminNotesConfigurator";
import type { AdminNotesStorage } from "@/core/domain/adminNotes/ports/adminNotesStorage";
import { InMemoryAppDeployer, InMemoryFileStorage } from "./shared";

export class InMemoryAdminNotesConfigurator implements AdminNotesConfigurator {
  private config: AdminNotesConfig = {
    content: "",
    includeInTemplateAndDuplicates: false,
  };
  private revision = "1";
  callLog: string[] = [];
  lastUpdateParams: {
    config: AdminNotesConfig;
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
  let container: TestAdminNotesContainer;

  beforeEach(() => {
    container = createTestAdminNotesContainer();
  });

  return () => container;
}
