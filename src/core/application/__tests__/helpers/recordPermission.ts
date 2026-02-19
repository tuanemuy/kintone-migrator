import { beforeEach } from "vitest";
import type { RecordPermissionContainer } from "@/core/application/container/recordPermission";
import { SystemError, SystemErrorCode } from "@/core/application/error";
import type { RecordRight } from "@/core/domain/recordPermission/entity";
import type { RecordPermissionConfigurator } from "@/core/domain/recordPermission/ports/recordPermissionConfigurator";
import type { RecordPermissionStorage } from "@/core/domain/recordPermission/ports/recordPermissionStorage";
import { InMemoryAppDeployer, InMemoryFileStorage } from "./shared";

export class InMemoryRecordPermissionConfigurator
  implements RecordPermissionConfigurator
{
  private permissions: {
    rights: readonly RecordRight[];
    revision: string;
  } = {
    rights: [],
    revision: "1",
  };
  callLog: string[] = [];
  lastUpdateParams: {
    rights: readonly RecordRight[];
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

  async getRecordPermissions(): Promise<{
    rights: readonly RecordRight[];
    revision: string;
  }> {
    this.callLog.push("getRecordPermissions");
    this.checkFail("getRecordPermissions");
    return { ...this.permissions };
  }

  async updateRecordPermissions(params: {
    rights: readonly RecordRight[];
    revision?: string;
  }): Promise<{ revision: string }> {
    this.callLog.push("updateRecordPermissions");
    this.checkFail("updateRecordPermissions");
    this.lastUpdateParams = params;
    const newRevision = String(Number(this.permissions.revision) + 1);
    this.permissions.revision = newRevision;
    return { revision: newRevision };
  }

  setPermissions(permissions: {
    rights: readonly RecordRight[];
    revision: string;
  }): void {
    this.permissions = permissions;
  }
}

export class InMemoryRecordPermissionStorage
  extends InMemoryFileStorage
  implements RecordPermissionStorage {}

export type TestRecordPermissionContainer = RecordPermissionContainer & {
  recordPermissionConfigurator: InMemoryRecordPermissionConfigurator;
  recordPermissionStorage: InMemoryRecordPermissionStorage;
  appDeployer: InMemoryAppDeployer;
};

export function createTestRecordPermissionContainer(): TestRecordPermissionContainer {
  return {
    recordPermissionConfigurator: new InMemoryRecordPermissionConfigurator(),
    recordPermissionStorage: new InMemoryRecordPermissionStorage(),
    appDeployer: new InMemoryAppDeployer(),
  };
}

export function setupTestRecordPermissionContainer(): () => TestRecordPermissionContainer {
  let container: TestRecordPermissionContainer;

  beforeEach(() => {
    container = createTestRecordPermissionContainer();
  });

  return () => container;
}
