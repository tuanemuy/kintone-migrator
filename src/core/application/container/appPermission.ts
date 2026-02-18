import type { AppPermissionConfigurator } from "@/core/domain/appPermission/ports/appPermissionConfigurator";
import type { AppPermissionStorage } from "@/core/domain/appPermission/ports/appPermissionStorage";
import type { AppDeployer } from "@/core/domain/ports/appDeployer";
import type { ServiceArgs } from "../types";

export type AppPermissionContainer = {
  appPermissionConfigurator: AppPermissionConfigurator;
  appPermissionStorage: AppPermissionStorage;
  appDeployer: AppDeployer;
};

export type AppPermissionServiceArgs<T = undefined> = ServiceArgs<
  AppPermissionContainer,
  T
>;
