import { SystemError, SystemErrorCode } from "@/core/application/error";
import type { RecordPermissionConfigurator } from "@/core/domain/recordPermission/ports/recordPermissionConfigurator";

export const emptyRecordPermissionConfigurator: RecordPermissionConfigurator = {
  async getRecordPermissions() {
    throw new SystemError(
      SystemErrorCode.InternalServerError,
      "EmptyRecordPermissionConfigurator.getRecordPermissions not implemented",
    );
  },
  async updateRecordPermissions() {
    throw new SystemError(
      SystemErrorCode.InternalServerError,
      "EmptyRecordPermissionConfigurator.updateRecordPermissions not implemented",
    );
  },
};
