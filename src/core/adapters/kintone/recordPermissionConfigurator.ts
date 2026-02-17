import type { KintoneRestAPIClient } from "@kintone/rest-api-client";
import { SystemError, SystemErrorCode } from "@/core/application/error";
import { isBusinessRuleError } from "@/core/domain/error";
import type { RecordRight } from "@/core/domain/recordPermission/entity";
import type { RecordPermissionConfigurator } from "@/core/domain/recordPermission/ports/recordPermissionConfigurator";
import type {
  RecordPermissionEntityType,
  RecordPermissionRightEntity,
} from "@/core/domain/recordPermission/valueObject";

const VALID_ENTITY_TYPES: ReadonlySet<string> = new Set([
  "USER",
  "GROUP",
  "ORGANIZATION",
  "FIELD_ENTITY",
]);

type KintoneRecordAclEntity = {
  entity: {
    type: string;
    code: string;
  };
  viewable: boolean;
  editable: boolean;
  deletable: boolean;
  includeSubs: boolean;
};

type KintoneRecordAclRight = {
  filterCond: string;
  entities: KintoneRecordAclEntity[];
};

function fromKintoneEntity(
  raw: KintoneRecordAclEntity,
): RecordPermissionRightEntity {
  if (!VALID_ENTITY_TYPES.has(raw.entity.type)) {
    throw new SystemError(
      SystemErrorCode.ExternalApiError,
      `Unexpected entity type from kintone API: ${raw.entity.type}`,
    );
  }

  return {
    entity: {
      type: raw.entity.type as RecordPermissionEntityType,
      code: raw.entity.code,
    },
    viewable: raw.viewable,
    editable: raw.editable,
    deletable: raw.deletable,
    includeSubs: raw.includeSubs,
  };
}

function fromKintoneRight(raw: KintoneRecordAclRight): RecordRight {
  return {
    filterCond: raw.filterCond,
    entities: raw.entities.map(fromKintoneEntity),
  };
}

function toKintoneEntity(
  entity: RecordPermissionRightEntity,
): Record<string, unknown> {
  return {
    entity: {
      type: entity.entity.type,
      code: entity.entity.code,
    },
    viewable: entity.viewable,
    editable: entity.editable,
    deletable: entity.deletable,
    includeSubs: entity.includeSubs,
  };
}

function toKintoneRight(right: RecordRight): Record<string, unknown> {
  return {
    filterCond: right.filterCond,
    entities: right.entities.map(toKintoneEntity),
  };
}

export class KintoneRecordPermissionConfigurator
  implements RecordPermissionConfigurator
{
  constructor(
    private readonly client: KintoneRestAPIClient,
    private readonly appId: string,
  ) {}

  async getRecordPermissions(): Promise<{
    rights: readonly RecordRight[];
    revision: string;
  }> {
    try {
      const response = await this.client.app.getRecordAcl({
        app: this.appId,
        preview: true,
      });

      const rights = (response.rights as KintoneRecordAclRight[]).map(
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
        "Failed to get record ACL",
        error,
      );
    }
  }

  async updateRecordPermissions(params: {
    rights: readonly RecordRight[];
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

      const response = await this.client.app.updateRecordAcl(
        requestParams as Parameters<typeof this.client.app.updateRecordAcl>[0],
      );

      return { revision: response.revision as string };
    } catch (error) {
      if (isBusinessRuleError(error)) throw error;
      if (error instanceof SystemError) throw error;
      throw new SystemError(
        SystemErrorCode.ExternalApiError,
        "Failed to update record ACL",
        error,
      );
    }
  }
}
