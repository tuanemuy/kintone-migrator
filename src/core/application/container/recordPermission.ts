import type { AppDeployer } from "@/core/domain/ports/appDeployer";
import type { RecordPermissionConfigurator } from "@/core/domain/recordPermission/ports/recordPermissionConfigurator";
import type { RecordPermissionStorage } from "@/core/domain/recordPermission/ports/recordPermissionStorage";
import type { ServiceArgs } from "../types";

export type RecordPermissionContainer = {
  recordPermissionConfigurator: RecordPermissionConfigurator;
  recordPermissionStorage: RecordPermissionStorage;
  appDeployer: AppDeployer;
};

export type RecordPermissionServiceArgs<T = undefined> = ServiceArgs<
  RecordPermissionContainer,
  T
>;
