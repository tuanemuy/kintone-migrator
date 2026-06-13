import type { AppRevisionReader } from "@/core/domain/appRevision/ports/appRevisionReader";
import type { AppRevisionStorage } from "@/core/domain/appRevision/ports/appRevisionStorage";
import type { AppDeployer } from "@/core/domain/ports/appDeployer";
import type { ConfigCodec } from "@/core/domain/ports/configCodec";
import type { ProcessManagementConfigurator } from "@/core/domain/processManagement/ports/processManagementConfigurator";
import type { ProcessManagementStateStorage } from "@/core/domain/processManagement/ports/processManagementStateStorage";
import type { ProcessManagementStorage } from "@/core/domain/processManagement/ports/processManagementStorage";
import type { ServiceArgs } from "../types";

export type ProcessManagementDiffContainer = {
  configCodec: ConfigCodec;
  processManagementConfigurator: ProcessManagementConfigurator;
  processManagementStorage: ProcessManagementStorage;
  // Base snapshot storage for 3-way diff/pull/push.
  processManagementStateStorage: ProcessManagementStateStorage;
  // App-scoped base revision storage (shared across domains).
  appRevisionStorage: AppRevisionStorage;
  // Reads the current remote app revision in one place.
  appRevisionReader: AppRevisionReader;
};

export type ProcessManagementContainer = ProcessManagementDiffContainer & {
  appDeployer: AppDeployer;
};

export type ProcessManagementDiffServiceArgs<T = undefined> = ServiceArgs<
  ProcessManagementDiffContainer,
  T
>;

export type ProcessManagementServiceArgs<T = undefined> = ServiceArgs<
  ProcessManagementContainer,
  T
>;
