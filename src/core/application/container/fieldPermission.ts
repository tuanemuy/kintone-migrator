import type { FieldPermissionConfigurator } from "@/core/domain/fieldPermission/ports/fieldPermissionConfigurator";
import type { FieldPermissionStorage } from "@/core/domain/fieldPermission/ports/fieldPermissionStorage";

export type FieldPermissionContainer = {
  fieldPermissionConfigurator: FieldPermissionConfigurator;
  fieldPermissionStorage: FieldPermissionStorage;
};

export type FieldPermissionServiceArgs<T = undefined> = T extends undefined
  ? { container: FieldPermissionContainer }
  : { container: FieldPermissionContainer; input: T };
