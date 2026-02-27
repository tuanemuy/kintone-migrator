import { SystemError, SystemErrorCode } from "@/core/application/error";
import type { ProcessManagementConfigurator } from "@/core/domain/processManagement/ports/processManagementConfigurator";

export const emptyProcessManagementConfigurator: ProcessManagementConfigurator =
  {
    async getProcessManagement() {
      throw new SystemError(
        SystemErrorCode.InternalServerError,
        "EmptyProcessManagementConfigurator.getProcessManagement not implemented",
      );
    },
    async updateProcessManagement() {
      throw new SystemError(
        SystemErrorCode.InternalServerError,
        "EmptyProcessManagementConfigurator.updateProcessManagement not implemented",
      );
    },
  };
