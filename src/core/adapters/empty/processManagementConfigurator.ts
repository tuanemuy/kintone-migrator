import { SystemError, SystemErrorCode } from "@/core/application/error";
import type { ProcessManagementConfig } from "@/core/domain/processManagement/entity";
import type { ProcessManagementConfigurator } from "@/core/domain/processManagement/ports/processManagementConfigurator";

export class EmptyProcessManagementConfigurator
  implements ProcessManagementConfigurator
{
  async getProcessManagement(): Promise<{
    config: ProcessManagementConfig;
    revision: string;
  }> {
    throw new SystemError(
      SystemErrorCode.InternalServerError,
      "EmptyProcessManagementConfigurator.getProcessManagement not implemented",
    );
  }

  async updateProcessManagement(_params: {
    config: ProcessManagementConfig;
    revision?: string;
  }): Promise<{ revision: string }> {
    throw new SystemError(
      SystemErrorCode.InternalServerError,
      "EmptyProcessManagementConfigurator.updateProcessManagement not implemented",
    );
  }
}
