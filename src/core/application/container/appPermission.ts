import type { AppPermissionConfigurator } from "@/core/domain/appPermission/ports/appPermissionConfigurator";
import type { AppPermissionStateStorage } from "@/core/domain/appPermission/ports/appPermissionStateStorage";
import type { AppPermissionStorage } from "@/core/domain/appPermission/ports/appPermissionStorage";
import type { AppRevisionReader } from "@/core/domain/appRevision/ports/appRevisionReader";
import type { AppRevisionStorage } from "@/core/domain/appRevision/ports/appRevisionStorage";
import type { AppDeployer } from "@/core/domain/ports/appDeployer";
import type { ConfigCodec } from "@/core/domain/ports/configCodec";
import type { ServiceArgs } from "../types";

export type AppPermissionDiffContainer = {
  configCodec: ConfigCodec;
  appPermissionConfigurator: AppPermissionConfigurator;
  appPermissionStorage: AppPermissionStorage;
  // Base snapshot storage for 3-way diff/pull/push.
  appPermissionStateStorage: AppPermissionStateStorage;
  // App-scoped base revision storage (shared across domains).
  appRevisionStorage: AppRevisionStorage;
  // Reads the current remote app revision in one place.
  appRevisionReader: AppRevisionReader;
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
