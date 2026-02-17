import { SystemError, SystemErrorCode } from "@/core/application/error";
import type { ViewConfig } from "@/core/domain/view/entity";
import type { ViewConfigurator } from "@/core/domain/view/ports/viewConfigurator";

export class EmptyViewConfigurator implements ViewConfigurator {
  async getViews(): Promise<{
    views: Readonly<Record<string, ViewConfig>>;
    revision: string;
  }> {
    throw new SystemError(
      SystemErrorCode.InternalServerError,
      "EmptyViewConfigurator.getViews not implemented",
    );
  }

  async updateViews(_params: {
    views: Readonly<Record<string, ViewConfig>>;
    revision?: string;
  }): Promise<{ revision: string }> {
    throw new SystemError(
      SystemErrorCode.InternalServerError,
      "EmptyViewConfigurator.updateViews not implemented",
    );
  }
}
