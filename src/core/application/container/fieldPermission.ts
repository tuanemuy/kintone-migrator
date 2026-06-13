import type { AppRevisionReader } from "@/core/domain/appRevision/ports/appRevisionReader";
import type { AppRevisionStorage } from "@/core/domain/appRevision/ports/appRevisionStorage";
import type { FieldPermissionConfigurator } from "@/core/domain/fieldPermission/ports/fieldPermissionConfigurator";
import type { FieldPermissionStateStorage } from "@/core/domain/fieldPermission/ports/fieldPermissionStateStorage";
import type { FieldPermissionStorage } from "@/core/domain/fieldPermission/ports/fieldPermissionStorage";
import type { AppDeployer } from "@/core/domain/ports/appDeployer";
import type { ConfigCodec } from "@/core/domain/ports/configCodec";
import type { ServiceArgs } from "../types";

export type FieldPermissionDiffContainer = {
  configCodec: ConfigCodec;
  fieldPermissionConfigurator: FieldPermissionConfigurator;
  fieldPermissionStorage: FieldPermissionStorage;
  // Base snapshot storage for 3-way diff/pull/push.
  fieldPermissionStateStorage: FieldPermissionStateStorage;
  // App-scoped base revision storage (shared across domains).
  appRevisionStorage: AppRevisionStorage;
  // Reads the current remote app revision in one place.
  appRevisionReader: AppRevisionReader;
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
