import type { AppPermissionContainer } from "@/core/application/container/appPermission";
import type { AppRight } from "@/core/domain/appPermission/entity";
import type { AppPermissionConfigurator } from "@/core/domain/appPermission/ports/appPermissionConfigurator";
import type { AppPermissionStateStorage } from "@/core/domain/appPermission/ports/appPermissionStateStorage";
import type { AppPermissionStorage } from "@/core/domain/appPermission/ports/appPermissionStorage";
import {
  FakeBase,
  InMemoryAppDeployer,
  InMemoryAppRevisionReader,
  InMemoryAppRevisionStorage,
  InMemoryFileStorage,
  setupContainer,
  testConfigCodec,
} from "./shared";

export class InMemoryAppPermissionConfigurator
  extends FakeBase
  implements AppPermissionConfigurator
{
  private permissions: {
    rights: readonly AppRight[];
    revision: string;
  } = {
    rights: [],
    revision: "1",
  };
  lastUpdateParams: {
    rights: readonly AppRight[];
    revision?: string;
  } | null = null;

  async getAppPermissions(): Promise<{
    rights: readonly AppRight[];
    revision: string;
  }> {
    this.trackCall("getAppPermissions");
    return { ...this.permissions };
  }

  async updateAppPermissions(params: {
    rights: readonly AppRight[];
    revision?: string;
  }): Promise<{ revision: string }> {
    this.trackCall("updateAppPermissions");
    this.lastUpdateParams = params;
    const newRevision = String(Number(this.permissions.revision) + 1);
    this.permissions.revision = newRevision;
    return { revision: newRevision };
  }

  setPermissions(permissions: {
    rights: readonly AppRight[];
    revision: string;
  }): void {
    this.permissions = permissions;
  }
}

export class InMemoryAppPermissionStorage
  extends InMemoryFileStorage
  implements AppPermissionStorage {}

export class InMemoryAppPermissionStateStorage
  extends InMemoryFileStorage
  implements AppPermissionStateStorage {}

export type TestAppPermissionContainer = AppPermissionContainer & {
  appPermissionConfigurator: InMemoryAppPermissionConfigurator;
  appPermissionStorage: InMemoryAppPermissionStorage;
  appPermissionStateStorage: InMemoryAppPermissionStateStorage;
  appRevisionStorage: InMemoryAppRevisionStorage;
  appRevisionReader: InMemoryAppRevisionReader;
  appDeployer: InMemoryAppDeployer;
};

export function createTestAppPermissionContainer(): TestAppPermissionContainer {
  return {
    configCodec: testConfigCodec,
    appPermissionConfigurator: new InMemoryAppPermissionConfigurator(),
    appPermissionStorage: new InMemoryAppPermissionStorage(),
    appPermissionStateStorage: new InMemoryAppPermissionStateStorage(),
    appRevisionStorage: new InMemoryAppRevisionStorage(),
    appRevisionReader: new InMemoryAppRevisionReader(),
    appDeployer: new InMemoryAppDeployer(),
  };
}

export function setupTestAppPermissionContainer(): () => TestAppPermissionContainer {
  return setupContainer(createTestAppPermissionContainer);
}
