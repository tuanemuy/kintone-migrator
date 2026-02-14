import type { KintoneRestAPIClient } from "@kintone/rest-api-client";
import { SystemError, SystemErrorCode } from "@/core/application/error";
import type { CustomizationConfigurator } from "@/core/domain/customization/ports/customizationConfigurator";
import type {
  CustomizationScope,
  RemotePlatform,
  RemoteResource,
  ResolvedResource,
} from "@/core/domain/customization/valueObject";
import { isBusinessRuleError } from "@/core/domain/error";

const VALID_SCOPES: ReadonlySet<string> = new Set(["ALL", "ADMIN", "NONE"]);

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

function toKintoneResource(
  resource: ResolvedResource,
): Record<string, unknown> {
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
): Record<string, unknown>[] {
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
      if (!VALID_SCOPES.has(rawScope)) {
        throw new SystemError(
          SystemErrorCode.ExternalApiError,
          `Unexpected scope value from kintone API: ${rawScope}`,
        );
      }
      const scope = rawScope as CustomizationScope;

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
      const requestParams: Record<string, unknown> = {
        app: this.appId,
      };

      if (params.scope !== undefined) {
        requestParams.scope = params.scope;
      }

      if (params.desktop) {
        const desktop: Record<string, unknown> = {};
        if (params.desktop.js) {
          desktop.js = toKintoneResourceList(params.desktop.js);
        }
        if (params.desktop.css) {
          desktop.css = toKintoneResourceList(params.desktop.css);
        }
        requestParams.desktop = desktop;
      }

      if (params.mobile) {
        const mobile: Record<string, unknown> = {};
        if (params.mobile.js) {
          mobile.js = toKintoneResourceList(params.mobile.js);
        }
        if (params.mobile.css) {
          mobile.css = toKintoneResourceList(params.mobile.css);
        }
        requestParams.mobile = mobile;
      }

      if (params.revision !== undefined) {
        requestParams.revision = params.revision;
      }

      const response = await this.client.app.updateAppCustomize(
        requestParams as Parameters<
          typeof this.client.app.updateAppCustomize
        >[0],
      );

      return { revision: response.revision as string };
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
