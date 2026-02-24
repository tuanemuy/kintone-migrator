import type { RecordPermissionContainer } from "@/core/application/container/recordPermission";
import type { RecordRight } from "@/core/domain/recordPermission/entity";
import type { RecordPermissionConfigurator } from "@/core/domain/recordPermission/ports/recordPermissionConfigurator";
import type { RecordPermissionStorage } from "@/core/domain/recordPermission/ports/recordPermissionStorage";
import {
  FakeBase,
  InMemoryAppDeployer,
  InMemoryFileStorage,
  setupContainer,
} from "./shared";

export class InMemoryRecordPermissionConfigurator
  extends FakeBase
  implements RecordPermissionConfigurator
{
  private permissions: {
    rights: readonly RecordRight[];
    revision: string;
  } = {
    rights: [],
    revision: "1",
  };
  lastUpdateParams: {
    rights: readonly RecordRight[];
    revision?: string;
  } | null = null;

  async getRecordPermissions(): Promise<{
    rights: readonly RecordRight[];
    revision: string;
  }> {
    this.trackCall("getRecordPermissions");
    return { ...this.permissions };
  }

  async updateRecordPermissions(params: {
    rights: readonly RecordRight[];
    revision?: string;
  }): Promise<{ revision: string }> {
    this.trackCall("updateRecordPermissions");
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
  return setupContainer(createTestRecordPermissionContainer);
}
