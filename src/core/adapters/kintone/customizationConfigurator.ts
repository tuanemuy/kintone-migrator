import type { KintoneRestAPIClient } from "@kintone/rest-api-client";
import { SystemError, SystemErrorCode } from "@/core/application/error";
import type { CustomizationConfigurator } from "@/core/domain/customization/ports/customizationConfigurator";
import type {
  CustomizationScope,
  RemotePlatform,
  RemoteResource,
  ResolvedResource,
} from "@/core/domain/customization/valueObject";
import { isCustomizationScope } from "@/core/domain/customization/valueObject";
import { isBusinessRuleError } from "@/core/domain/error";

type KintoneCustomizeResource = {
  type: "FILE" | "URL";
  file?: {
    fileKey: string;
    name: string;
    contentType: string;
    size: string;
  };
  url?: string;
};

function fromKintoneResource(raw: KintoneCustomizeResource): RemoteResource {
  if (raw.type === "FILE" && raw.file) {
    return {
      type: "FILE",
      file: {
        fileKey: raw.file.fileKey,
        name: raw.file.name,
        contentType: raw.file.contentType,
        size: raw.file.size,
      },
    };
  }
  return {
    type: "URL",
    url: raw.url ?? "",
  };
}

function fromKintoneResourceList(
  raw: readonly KintoneCustomizeResource[],
): readonly RemoteResource[] {
  return raw.map(fromKintoneResource);
}

type KintoneCustomizeResourceForParameter =
  | { type: "FILE"; file: { fileKey: string } }
  | { type: "URL"; url: string };

function toKintoneResource(
  resource: ResolvedResource,
): KintoneCustomizeResourceForParameter {
  if (resource.type === "FILE") {
    return {
      type: "FILE",
      file: { fileKey: resource.fileKey },
    };
  }
  return {
    type: "URL",
    url: resource.url,
  };
}

function toKintoneResourceList(
  resources: readonly ResolvedResource[],
): KintoneCustomizeResourceForParameter[] {
  return resources.map(toKintoneResource);
}

export class KintoneCustomizationConfigurator
  implements CustomizationConfigurator
{
  constructor(
    private readonly client: KintoneRestAPIClient,
    private readonly appId: string,
  ) {}

  async getCustomization(): Promise<{
    scope: CustomizationScope;
    desktop: RemotePlatform;
    mobile: RemotePlatform;
    revision: string;
  }> {
    try {
      const response = await this.client.app.getAppCustomize({
        app: this.appId,
        preview: true,
      });

      const rawScope = String(response.scope);
      if (!isCustomizationScope(rawScope)) {
        throw new SystemError(
          SystemErrorCode.ExternalApiError,
          `Unexpected scope value from kintone API: ${rawScope}`,
        );
      }
      const scope: CustomizationScope = rawScope;

      const desktop: RemotePlatform = {
        js: fromKintoneResourceList(
          (response.desktop?.js ?? []) as KintoneCustomizeResource[],
        ),
        css: fromKintoneResourceList(
          (response.desktop?.css ?? []) as KintoneCustomizeResource[],
        ),
      };

      const mobile: RemotePlatform = {
        js: fromKintoneResourceList(
          (response.mobile?.js ?? []) as KintoneCustomizeResource[],
        ),
        css: fromKintoneResourceList(
          (response.mobile?.css ?? []) as KintoneCustomizeResource[],
        ),
      };

      return {
        scope,
        desktop,
        mobile,
        revision: response.revision as string,
      };
    } catch (error) {
      if (isBusinessRuleError(error)) throw error;
      if (error instanceof SystemError) throw error;
      throw new SystemError(
        SystemErrorCode.ExternalApiError,
        "Failed to get app customization",
        error,
      );
    }
  }

  async updateCustomization(params: {
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
    try {
      type UpdateParams = Parameters<
        typeof this.client.app.updateAppCustomize
      >[0];

      const requestParams: UpdateParams = {
        app: this.appId,
        ...(params.scope !== undefined ? { scope: params.scope } : {}),
        ...(params.desktop !== undefined
          ? {
              desktop: {
                ...(params.desktop.js !== undefined
                  ? { js: toKintoneResourceList(params.desktop.js) }
                  : {}),
                ...(params.desktop.css !== undefined
                  ? { css: toKintoneResourceList(params.desktop.css) }
                  : {}),
              },
            }
          : {}),
        ...(params.mobile !== undefined
          ? {
              mobile: {
                ...(params.mobile.js !== undefined
                  ? { js: toKintoneResourceList(params.mobile.js) }
                  : {}),
                ...(params.mobile.css !== undefined
                  ? { css: toKintoneResourceList(params.mobile.css) }
                  : {}),
              },
            }
          : {}),
        ...(params.revision !== undefined ? { revision: params.revision } : {}),
      };

      const response = await this.client.app.updateAppCustomize(requestParams);

      return { revision: String(response.revision) };
    } catch (error) {
      if (isBusinessRuleError(error)) throw error;
      if (error instanceof SystemError) throw error;
      throw new SystemError(
        SystemErrorCode.ExternalApiError,
        "Failed to update app customization",
        error,
      );
    }
  }
}
