import type { AppPermissionConfigurator } from "@/core/domain/appPermission/ports/appPermissionConfigurator";
import type { AppPermissionStorage } from "@/core/domain/appPermission/ports/appPermissionStorage";
import type { AppDeployer } from "@/core/domain/ports/appDeployer";
import type { ServiceArgs } from "../types";

export type AppPermissionDiffContainer = {
  appPermissionConfigurator: AppPermissionConfigurator;
  appPermissionStorage: AppPermissionStorage;
};

export type AppPermissionContainer = AppPermissionDiffContainer & {
  appDeployer: AppDeployer;
};

export type AppPermissionDiffServiceArgs<T = undefined> = ServiceArgs<
  AppPermissionDiffContainer,
  T
>;

export type AppPermissionServiceArgs<T = undefined> = ServiceArgs<
  AppPermissionContainer,
  T
>;
