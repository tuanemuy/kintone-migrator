import type { FieldPermissionContainer } from "@/core/application/container/fieldPermission";
import type { FieldRight } from "@/core/domain/fieldPermission/entity";
import type { FieldPermissionConfigurator } from "@/core/domain/fieldPermission/ports/fieldPermissionConfigurator";
import type { FieldPermissionStorage } from "@/core/domain/fieldPermission/ports/fieldPermissionStorage";
import {
  FakeBase,
  InMemoryAppDeployer,
  InMemoryFileStorage,
  setupContainer,
} from "./shared";

export class InMemoryFieldPermissionConfigurator
  extends FakeBase
  implements FieldPermissionConfigurator
{
  private permissions: {
    rights: readonly FieldRight[];
    revision: string;
  } = {
    rights: [],
    revision: "1",
  };
  lastUpdateParams: {
    rights: readonly FieldRight[];
    revision?: string;
  } | null = null;

  async getFieldPermissions(): Promise<{
    rights: readonly FieldRight[];
    revision: string;
  }> {
    this.trackCall("getFieldPermissions");
    return { ...this.permissions };
  }

  async updateFieldPermissions(params: {
    rights: readonly FieldRight[];
    revision?: string;
  }): Promise<{ revision: string }> {
    this.trackCall("updateFieldPermissions");
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
  return setupContainer(createTestFieldPermissionContainer);
}
