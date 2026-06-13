import type { RecordPermissionContainer } from "@/core/application/container/recordPermission";
import type { RecordRight } from "@/core/domain/recordPermission/entity";
import type { RecordPermissionConfigurator } from "@/core/domain/recordPermission/ports/recordPermissionConfigurator";
import type { RecordPermissionStateStorage } from "@/core/domain/recordPermission/ports/recordPermissionStateStorage";
import type { RecordPermissionStorage } from "@/core/domain/recordPermission/ports/recordPermissionStorage";
import {
  FakeBase,
  InMemoryAppDeployer,
  InMemoryAppRevisionReader,
  InMemoryAppRevisionStorage,
  InMemoryFileStorage,
  setupContainer,
  testConfigCodec,
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

export class InMemoryRecordPermissionStateStorage
  extends InMemoryFileStorage
  implements RecordPermissionStateStorage {}

export type TestRecordPermissionContainer = RecordPermissionContainer & {
  recordPermissionConfigurator: InMemoryRecordPermissionConfigurator;
  recordPermissionStorage: InMemoryRecordPermissionStorage;
  recordPermissionStateStorage: InMemoryRecordPermissionStateStorage;
  appRevisionStorage: InMemoryAppRevisionStorage;
  appRevisionReader: InMemoryAppRevisionReader;
  appDeployer: InMemoryAppDeployer;
};

export function createTestRecordPermissionContainer(): TestRecordPermissionContainer {
  return {
    configCodec: testConfigCodec,
    recordPermissionConfigurator: new InMemoryRecordPermissionConfigurator(),
    recordPermissionStorage: new InMemoryRecordPermissionStorage(),
    recordPermissionStateStorage: new InMemoryRecordPermissionStateStorage(),
    appRevisionStorage: new InMemoryAppRevisionStorage(),
    appRevisionReader: new InMemoryAppRevisionReader(),
    appDeployer: new InMemoryAppDeployer(),
  };
}

export function setupTestRecordPermissionContainer(): () => TestRecordPermissionContainer {
  return setupContainer(createTestRecordPermissionContainer);
}
