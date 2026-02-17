import type { AppPermissionConfigurator } from "@/core/domain/appPermission/ports/appPermissionConfigurator";
import type { AppPermissionStorage } from "@/core/domain/appPermission/ports/appPermissionStorage";
import type { AppDeployer } from "@/core/domain/ports/appDeployer";

export type AppPermissionContainer = {
  appPermissionConfigurator: AppPermissionConfigurator;
  appPermissionStorage: AppPermissionStorage;
  appDeployer: AppDeployer;
};

export type AppPermissionServiceArgs<T = undefined> = T extends undefined
  ? { container: AppPermissionContainer }
  : { container: AppPermissionContainer; input: T };
