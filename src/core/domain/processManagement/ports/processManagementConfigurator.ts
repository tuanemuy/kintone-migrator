import type { ProcessManagementConfig } from "../entity";

export interface ProcessManagementConfigurator {
  getProcessManagement(): Promise<{
    config: ProcessManagementConfig;
    /** Optimistic concurrency control token from kintone API. */
    revision: string;
  }>;
  updateProcessManagement(params: {
    config: ProcessManagementConfig;
    /** Pass revision for optimistic concurrency control, or omit for forced write. */
    revision?: string;
  }): Promise<{ revision: string }>;
}
