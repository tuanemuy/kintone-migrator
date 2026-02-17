import type { AppDeployer } from "@/core/domain/ports/appDeployer";
import type { RecordPermissionConfigurator } from "@/core/domain/recordPermission/ports/recordPermissionConfigurator";
import type { RecordPermissionStorage } from "@/core/domain/recordPermission/ports/recordPermissionStorage";

export type RecordPermissionContainer = {
  recordPermissionConfigurator: RecordPermissionConfigurator;
  recordPermissionStorage: RecordPermissionStorage;
  appDeployer: AppDeployer;
};

export type RecordPermissionServiceArgs<T = undefined> = T extends undefined
  ? { container: RecordPermissionContainer }
  : { container: RecordPermissionContainer; input: T };
