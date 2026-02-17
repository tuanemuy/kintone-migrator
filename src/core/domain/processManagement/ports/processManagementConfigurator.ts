import type { ProcessManagementConfig } from "../entity";

export interface ProcessManagementConfigurator {
  getProcessManagement(): Promise<{
    config: ProcessManagementConfig;
    revision: string;
  }>;
  updateProcessManagement(params: {
    config: ProcessManagementConfig;
    revision?: string;
  }): Promise<{ revision: string }>;
}
