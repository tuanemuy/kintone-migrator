import { beforeEach } from "vitest";
import type { AppPermissionContainer } from "@/core/application/container/appPermission";
import { SystemError, SystemErrorCode } from "@/core/application/error";
import type { AppRight } from "@/core/domain/appPermission/entity";
import type { AppPermissionConfigurator } from "@/core/domain/appPermission/ports/appPermissionConfigurator";
import type { AppPermissionStorage } from "@/core/domain/appPermission/ports/appPermissionStorage";
import { InMemoryAppDeployer, InMemoryFileStorage } from "./shared";

export class InMemoryAppPermissionConfigurator
  implements AppPermissionConfigurator
{
  private permissions: {
    rights: readonly AppRight[];
    revision: string;
  } = {
    rights: [],
    revision: "1",
  };
  callLog: string[] = [];
  lastUpdateParams: {
    rights: readonly AppRight[];
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
  let container: TestAppPermissionContainer;

  beforeEach(() => {
    container = createTestAppPermissionContainer();
  });

  return () => container;
}
