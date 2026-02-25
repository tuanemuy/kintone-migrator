import { SystemError, SystemErrorCode } from "@/core/application/error";
import type { GeneralSettingsConfig } from "@/core/domain/generalSettings/entity";
import type { GeneralSettingsConfigurator } from "@/core/domain/generalSettings/ports/generalSettingsConfigurator";

export class EmptyGeneralSettingsConfigurator
  implements GeneralSettingsConfigurator
{
  async getGeneralSettings(): Promise<{
    config: GeneralSettingsConfig;
    revision: string;
  }> {
    throw new SystemError(
      SystemErrorCode.InternalServerError,
      "EmptyGeneralSettingsConfigurator.getGeneralSettings not implemented",
    );
  }

  async updateGeneralSettings(_params: {
    config: GeneralSettingsConfig;
    revision?: string;
  }): Promise<{ revision: string }> {
    throw new SystemError(
      SystemErrorCode.InternalServerError,
      "EmptyGeneralSettingsConfigurator.updateGeneralSettings not implemented",
    );
  }
}
