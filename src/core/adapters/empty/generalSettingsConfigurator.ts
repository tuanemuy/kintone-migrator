import { SystemError, SystemErrorCode } from "@/core/application/error";
import type { GeneralSettingsConfigurator } from "@/core/domain/generalSettings/ports/generalSettingsConfigurator";

export const emptyGeneralSettingsConfigurator: GeneralSettingsConfigurator = {
  async getGeneralSettings() {
    throw new SystemError(
      SystemErrorCode.InternalServerError,
      "EmptyGeneralSettingsConfigurator.getGeneralSettings not implemented",
    );
  },
  async updateGeneralSettings() {
    throw new SystemError(
      SystemErrorCode.InternalServerError,
      "EmptyGeneralSettingsConfigurator.updateGeneralSettings not implemented",
    );
  },
};
