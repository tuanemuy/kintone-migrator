import type { AppDeployer } from "@/core/domain/ports/appDeployer";
import type { ProcessManagementConfigurator } from "@/core/domain/processManagement/ports/processManagementConfigurator";
import type { ProcessManagementStorage } from "@/core/domain/processManagement/ports/processManagementStorage";
import type { ServiceArgs } from "../types";

export type ProcessManagementDiffContainer = {
  processManagementConfigurator: ProcessManagementConfigurator;
  processManagementStorage: ProcessManagementStorage;
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
