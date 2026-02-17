import { SystemError, SystemErrorCode } from "@/core/application/error";
import type { ActionConfig } from "@/core/domain/action/entity";
import type { ActionConfigurator } from "@/core/domain/action/ports/actionConfigurator";

export class EmptyActionConfigurator implements ActionConfigurator {
  async getActions(): Promise<{
    actions: Readonly<Record<string, ActionConfig>>;
    revision: string;
  }> {
    throw new SystemError(
      SystemErrorCode.InternalServerError,
      "EmptyActionConfigurator.getActions not implemented",
    );
  }

  async updateActions(_params: {
    actions: Readonly<Record<string, ActionConfig>>;
    revision?: string;
  }): Promise<{ revision: string }> {
    throw new SystemError(
      SystemErrorCode.InternalServerError,
      "EmptyActionConfigurator.updateActions not implemented",
    );
  }
}
