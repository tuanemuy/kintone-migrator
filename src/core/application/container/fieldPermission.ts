import type { FieldPermissionConfigurator } from "@/core/domain/fieldPermission/ports/fieldPermissionConfigurator";
import type { FieldPermissionStorage } from "@/core/domain/fieldPermission/ports/fieldPermissionStorage";
import type { AppDeployer } from "@/core/domain/ports/appDeployer";

export type FieldPermissionContainer = {
  fieldPermissionConfigurator: FieldPermissionConfigurator;
  fieldPermissionStorage: FieldPermissionStorage;
  appDeployer: AppDeployer;
};

export type FieldPermissionServiceArgs<T = undefined> = T extends undefined
  ? { container: FieldPermissionContainer }
  : { container: FieldPermissionContainer; input: T };
