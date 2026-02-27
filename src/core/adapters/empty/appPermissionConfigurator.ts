import { SystemError, SystemErrorCode } from "@/core/application/error";
import type { AppPermissionConfigurator } from "@/core/domain/appPermission/ports/appPermissionConfigurator";

export const emptyAppPermissionConfigurator: AppPermissionConfigurator = {
  async getAppPermissions() {
    throw new SystemError(
      SystemErrorCode.InternalServerError,
      "EmptyAppPermissionConfigurator.getAppPermissions not implemented",
    );
  },
  async updateAppPermissions() {
    throw new SystemError(
      SystemErrorCode.InternalServerError,
      "EmptyAppPermissionConfigurator.updateAppPermissions not implemented",
    );
  },
};
