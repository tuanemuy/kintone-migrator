import { SystemError, SystemErrorCode } from "@/core/application/error";
import type { RecordRight } from "@/core/domain/recordPermission/entity";
import type { RecordPermissionConfigurator } from "@/core/domain/recordPermission/ports/recordPermissionConfigurator";

export class EmptyRecordPermissionConfigurator
  implements RecordPermissionConfigurator
{
  async getRecordPermissions(): Promise<{
    rights: readonly RecordRight[];
    revision: string;
  }> {
    throw new SystemError(
      SystemErrorCode.InternalServerError,
      "EmptyRecordPermissionConfigurator.getRecordPermissions not implemented",
    );
  }

  async updateRecordPermissions(_params: {
    rights: readonly RecordRight[];
    revision?: string;
  }): Promise<{ revision: string }> {
    throw new SystemError(
      SystemErrorCode.InternalServerError,
      "EmptyRecordPermissionConfigurator.updateRecordPermissions not implemented",
    );
  }
}
