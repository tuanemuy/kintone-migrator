import { SystemError, SystemErrorCode } from "@/core/application/error";
import type { FieldRight } from "@/core/domain/fieldPermission/entity";
import type { FieldPermissionConfigurator } from "@/core/domain/fieldPermission/ports/fieldPermissionConfigurator";

export class EmptyFieldPermissionConfigurator
  implements FieldPermissionConfigurator
{
  async getFieldPermissions(): Promise<{
    rights: readonly FieldRight[];
    revision: string;
  }> {
    throw new SystemError(
      SystemErrorCode.InternalServerError,
      "EmptyFieldPermissionConfigurator.getFieldPermissions not implemented",
    );
  }

  async updateFieldPermissions(_params: {
    rights: readonly FieldRight[];
    revision?: string;
  }): Promise<{ revision: string }> {
    throw new SystemError(
      SystemErrorCode.InternalServerError,
      "EmptyFieldPermissionConfigurator.updateFieldPermissions not implemented",
    );
  }
}
