import type { FieldPermissionConfigurator } from "@/core/domain/fieldPermission/ports/fieldPermissionConfigurator";
import type { FieldPermissionStorage } from "@/core/domain/fieldPermission/ports/fieldPermissionStorage";
import type { AppDeployer } from "@/core/domain/ports/appDeployer";
import type { ConfigCodec } from "@/core/domain/ports/configCodec";
import type { ServiceArgs } from "../types";

export type FieldPermissionDiffContainer = {
  configCodec: ConfigCodec;
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
