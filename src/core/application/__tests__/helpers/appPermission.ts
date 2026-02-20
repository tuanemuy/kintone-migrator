import type { AppPermissionContainer } from "@/core/application/container/appPermission";
import type { AppRight } from "@/core/domain/appPermission/entity";
import type { AppPermissionConfigurator } from "@/core/domain/appPermission/ports/appPermissionConfigurator";
import type { AppPermissionStorage } from "@/core/domain/appPermission/ports/appPermissionStorage";
import {
  InMemoryAppDeployer,
  InMemoryFileStorage,
  setupContainer,
  TestDouble,
} from "./shared";

export class InMemoryAppPermissionConfigurator
  extends TestDouble
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
    this.callLog.push("getAppPermissions");
    this.checkFail("getAppPermissions");
    return { ...this.permissions };
  }

  async updateAppPermissions(params: {
    rights: readonly AppRight[];
    revision?: string;
  }): Promise<{ revision: string }> {
    this.callLog.push("updateAppPermissions");
    this.checkFail("updateAppPermissions");
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

export type TestAppPermissionContainer = AppPermissionContainer & {
  appPermissionConfigurator: InMemoryAppPermissionConfigurator;
  appPermissionStorage: InMemoryAppPermissionStorage;
  appDeployer: InMemoryAppDeployer;
};

export function createTestAppPermissionContainer(): TestAppPermissionContainer {
  return {
    appPermissionConfigurator: new InMemoryAppPermissionConfigurator(),
    appPermissionStorage: new InMemoryAppPermissionStorage(),
    appDeployer: new InMemoryAppDeployer(),
  };
}

export function setupTestAppPermissionContainer(): () => TestAppPermissionContainer {
  return setupContainer(createTestAppPermissionContainer);
}
