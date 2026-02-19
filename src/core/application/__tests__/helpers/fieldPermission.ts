import { beforeEach } from "vitest";
import type { FieldPermissionContainer } from "@/core/application/container/fieldPermission";
import { SystemError, SystemErrorCode } from "@/core/application/error";
import type { FieldRight } from "@/core/domain/fieldPermission/entity";
import type { FieldPermissionConfigurator } from "@/core/domain/fieldPermission/ports/fieldPermissionConfigurator";
import type { FieldPermissionStorage } from "@/core/domain/fieldPermission/ports/fieldPermissionStorage";
import { InMemoryAppDeployer, InMemoryFileStorage } from "./shared";

export class InMemoryFieldPermissionConfigurator
  implements FieldPermissionConfigurator
{
  private permissions: {
    rights: readonly FieldRight[];
    revision: string;
  } = {
    rights: [],
    revision: "1",
  };
  callLog: string[] = [];
  lastUpdateParams: {
    rights: readonly FieldRight[];
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

  async getFieldPermissions(): Promise<{
    rights: readonly FieldRight[];
    revision: string;
  }> {
    this.callLog.push("getFieldPermissions");
    this.checkFail("getFieldPermissions");
    return { ...this.permissions };
  }

  async updateFieldPermissions(params: {
    rights: readonly FieldRight[];
    revision?: string;
  }): Promise<{ revision: string }> {
    this.callLog.push("updateFieldPermissions");
    this.checkFail("updateFieldPermissions");
    this.lastUpdateParams = params;
    const newRevision = String(Number(this.permissions.revision) + 1);
    this.permissions.revision = newRevision;
    return { revision: newRevision };
  }

  setPermissions(permissions: {
    rights: readonly FieldRight[];
    revision: string;
  }): void {
    this.permissions = permissions;
  }
}

export class InMemoryFieldPermissionStorage
  extends InMemoryFileStorage
  implements FieldPermissionStorage {}

export type TestFieldPermissionContainer = FieldPermissionContainer & {
  fieldPermissionConfigurator: InMemoryFieldPermissionConfigurator;
  fieldPermissionStorage: InMemoryFieldPermissionStorage;
  appDeployer: InMemoryAppDeployer;
};

export function createTestFieldPermissionContainer(): TestFieldPermissionContainer {
  return {
    fieldPermissionConfigurator: new InMemoryFieldPermissionConfigurator(),
    fieldPermissionStorage: new InMemoryFieldPermissionStorage(),
    appDeployer: new InMemoryAppDeployer(),
  };
}

export function setupTestFieldPermissionContainer(): () => TestFieldPermissionContainer {
  let container: TestFieldPermissionContainer;

  beforeEach(() => {
    container = createTestFieldPermissionContainer();
  });

  return () => container;
}
