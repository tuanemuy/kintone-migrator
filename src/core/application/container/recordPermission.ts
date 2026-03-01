import type { AppDeployer } from "@/core/domain/ports/appDeployer";
import type { RecordPermissionConfigurator } from "@/core/domain/recordPermission/ports/recordPermissionConfigurator";
import type { RecordPermissionStorage } from "@/core/domain/recordPermission/ports/recordPermissionStorage";
import type { ServiceArgs } from "../types";

export type RecordPermissionDiffContainer = {
  recordPermissionConfigurator: RecordPermissionConfigurator;
  recordPermissionStorage: RecordPermissionStorage;
};

export type RecordPermissionContainer = RecordPermissionDiffContainer & {
  appDeployer: AppDeployer;
};

export type RecordPermissionDiffServiceArgs<T = undefined> = ServiceArgs<
  RecordPermissionDiffContainer,
  T
>;

export type RecordPermissionServiceArgs<T = undefined> = ServiceArgs<
  RecordPermissionContainer,
  T
>;
