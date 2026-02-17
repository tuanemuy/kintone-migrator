import type { KintoneRestAPIClient } from "@kintone/rest-api-client";
import { SystemError, SystemErrorCode } from "@/core/application/error";
import type { AppRight } from "@/core/domain/appPermission/entity";
import type { AppPermissionConfigurator } from "@/core/domain/appPermission/ports/appPermissionConfigurator";
import type { AppPermissionEntityType } from "@/core/domain/appPermission/valueObject";
import { isBusinessRuleError } from "@/core/domain/error";

const VALID_ENTITY_TYPES: ReadonlySet<string> = new Set([
  "USER",
  "GROUP",
  "ORGANIZATION",
  "CREATOR",
]);

type KintoneAppAclRight = {
  entity: {
    type: string;
    code: string | null;
  };
  includeSubs: boolean;
  appEditable: boolean;
  recordViewable: boolean;
  recordAddable: boolean;
  recordEditable: boolean;
  recordDeletable: boolean;
  recordImportable: boolean;
  recordExportable: boolean;
};

function fromKintoneRight(raw: KintoneAppAclRight): AppRight {
  if (!VALID_ENTITY_TYPES.has(raw.entity.type)) {
    throw new SystemError(
      SystemErrorCode.ExternalApiError,
      `Unexpected entity type from kintone API: ${raw.entity.type}`,
    );
  }

  const type = raw.entity.type as AppPermissionEntityType;
  let code: string;
  if (type === "CREATOR") {
    code = raw.entity.code ?? "";
  } else {
    if (!raw.entity.code) {
      throw new SystemError(
        SystemErrorCode.ExternalApiError,
        `Entity code is required for type ${type}`,
      );
    }
    code = raw.entity.code;
  }

  return {
    entity: {
      type,
      code,
    },
    includeSubs: raw.includeSubs,
    appEditable: raw.appEditable,
    recordViewable: raw.recordViewable,
    recordAddable: raw.recordAddable,
    recordEditable: raw.recordEditable,
    recordDeletable: raw.recordDeletable,
    recordImportable: raw.recordImportable,
    recordExportable: raw.recordExportable,
  };
}

function toKintoneRight(right: AppRight): Record<string, unknown> {
  return {
    entity: {
      type: right.entity.type,
      ...(right.entity.type !== "CREATOR" ? { code: right.entity.code } : {}),
    },
    includeSubs: right.includeSubs,
    appEditable: right.appEditable,
    recordViewable: right.recordViewable,
    recordAddable: right.recordAddable,
    recordEditable: right.recordEditable,
    recordDeletable: right.recordDeletable,
    recordImportable: right.recordImportable,
    recordExportable: right.recordExportable,
  };
}

export class KintoneAppPermissionConfigurator
  implements AppPermissionConfigurator
{
  constructor(
    private readonly client: KintoneRestAPIClient,
    private readonly appId: string,
  ) {}

  async getAppPermissions(): Promise<{
    rights: readonly AppRight[];
    revision: string;
  }> {
    try {
      const response = await this.client.app.getAppAcl({
        app: this.appId,
        preview: true,
      });

      const rights = (response.rights as KintoneAppAclRight[]).map(
        fromKintoneRight,
      );

      return {
        rights,
        revision: response.revision as string,
      };
    } catch (error) {
      if (isBusinessRuleError(error)) throw error;
      if (error instanceof SystemError) throw error;
      throw new SystemError(
        SystemErrorCode.ExternalApiError,
        "Failed to get app ACL",
        error,
      );
    }
  }

  async updateAppPermissions(params: {
    rights: readonly AppRight[];
    revision?: string;
  }): Promise<{ revision: string }> {
    try {
      const requestParams: Record<string, unknown> = {
        app: this.appId,
        rights: params.rights.map(toKintoneRight),
      };

      if (params.revision !== undefined) {
        requestParams.revision = params.revision;
      }

      const response = await this.client.app.updateAppAcl(
        requestParams as Parameters<typeof this.client.app.updateAppAcl>[0],
      );

      return { revision: response.revision as string };
    } catch (error) {
      if (isBusinessRuleError(error)) throw error;
      if (error instanceof SystemError) throw error;
      throw new SystemError(
        SystemErrorCode.ExternalApiError,
        "Failed to update app ACL",
        error,
      );
    }
  }
}
