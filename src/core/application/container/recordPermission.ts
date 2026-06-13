import type { AppRevisionReader } from "@/core/domain/appRevision/ports/appRevisionReader";
import type { AppRevisionStorage } from "@/core/domain/appRevision/ports/appRevisionStorage";
import type { AppDeployer } from "@/core/domain/ports/appDeployer";
import type { ConfigCodec } from "@/core/domain/ports/configCodec";
import type { RecordPermissionConfigurator } from "@/core/domain/recordPermission/ports/recordPermissionConfigurator";
import type { RecordPermissionStateStorage } from "@/core/domain/recordPermission/ports/recordPermissionStateStorage";
import type { RecordPermissionStorage } from "@/core/domain/recordPermission/ports/recordPermissionStorage";
import type { ServiceArgs } from "../types";

export type RecordPermissionDiffContainer = {
  configCodec: ConfigCodec;
  recordPermissionConfigurator: RecordPermissionConfigurator;
  recordPermissionStorage: RecordPermissionStorage;
  // Base snapshot storage for 3-way diff/pull/push.
  recordPermissionStateStorage: RecordPermissionStateStorage;
  // App-scoped base revision storage (shared across domains).
  appRevisionStorage: AppRevisionStorage;
  // Reads the current remote app revision in one place.
  appRevisionReader: AppRevisionReader;
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
