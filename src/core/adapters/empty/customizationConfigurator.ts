import { SystemError, SystemErrorCode } from "@/core/application/error";
import type { CustomizationConfigurator } from "@/core/domain/customization/ports/customizationConfigurator";
import type {
  CustomizationScope,
  RemotePlatform,
  ResolvedResource,
} from "@/core/domain/customization/valueObject";

export class EmptyCustomizationConfigurator
  implements CustomizationConfigurator
{
  async getCustomization(): Promise<{
    scope: CustomizationScope;
    desktop: RemotePlatform;
    mobile: RemotePlatform;
    revision: string;
  }> {
    throw new SystemError(
      SystemErrorCode.InternalServerError,
      "EmptyCustomizationConfigurator.getCustomization not implemented",
    );
  }

  async updateCustomization(_params: {
    scope?: CustomizationScope;
    desktop?: {
      js?: readonly ResolvedResource[];
      css?: readonly ResolvedResource[];
    };
    mobile?: {
      js?: readonly ResolvedResource[];
      css?: readonly ResolvedResource[];
    };
    revision?: string;
  }): Promise<{ revision: string }> {
    throw new SystemError(
      SystemErrorCode.InternalServerError,
      "EmptyCustomizationConfigurator.updateCustomization not implemented",
    );
  }
}
