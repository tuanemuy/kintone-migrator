import { SystemError, SystemErrorCode } from "@/core/application/error";
import type { AppRight } from "@/core/domain/appPermission/entity";
import type { AppPermissionConfigurator } from "@/core/domain/appPermission/ports/appPermissionConfigurator";

export class EmptyAppPermissionConfigurator
  implements AppPermissionConfigurator
{
  async getAppPermissions(): Promise<{
    rights: readonly AppRight[];
    revision: string;
  }> {
    throw new SystemError(
      SystemErrorCode.InternalServerError,
      "EmptyAppPermissionConfigurator.getAppPermissions not implemented",
    );
  }

  async updateAppPermissions(_params: {
    rights: readonly AppRight[];
    revision?: string;
  }): Promise<{ revision: string }> {
    throw new SystemError(
      SystemErrorCode.InternalServerError,
      "EmptyAppPermissionConfigurator.updateAppPermissions not implemented",
    );
  }
}
