import type { FieldPermissionConfigurator } from "@/core/domain/fieldPermission/ports/fieldPermissionConfigurator";
import type { FieldPermissionStorage } from "@/core/domain/fieldPermission/ports/fieldPermissionStorage";
import type { AppDeployer } from "@/core/domain/ports/appDeployer";
import type { ServiceArgs } from "../types";

export type FieldPermissionDiffContainer = {
  fieldPermissionConfigurator: FieldPermissionConfigurator;
  fieldPermissionStorage: FieldPermissionStorage;
};

export type FieldPermissionContainer = FieldPermissionDiffContainer & {
  appDeployer: AppDeployer;
};

export type FieldPermissionDiffServiceArgs<T = undefined> = ServiceArgs<
  FieldPermissionDiffContainer,
  T
>;

export type FieldPermissionServiceArgs<T = undefined> = ServiceArgs<
  FieldPermissionContainer,
  T
>;
