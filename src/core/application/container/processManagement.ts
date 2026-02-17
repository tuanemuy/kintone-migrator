import type { AppDeployer } from "@/core/domain/ports/appDeployer";
import type { ProcessManagementConfigurator } from "@/core/domain/processManagement/ports/processManagementConfigurator";
import type { ProcessManagementStorage } from "@/core/domain/processManagement/ports/processManagementStorage";

export type ProcessManagementContainer = {
  processManagementConfigurator: ProcessManagementConfigurator;
  processManagementStorage: ProcessManagementStorage;
  appDeployer: AppDeployer;
};

export type ProcessManagementServiceArgs<T = undefined> = T extends undefined
  ? { container: ProcessManagementContainer }
  : { container: ProcessManagementContainer; input: T };
